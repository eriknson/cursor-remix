import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const timeRange = searchParams.get('timeRange') || '365d'
  
  // Calculate the date range
  const endDate = new Date()
  const startDate = new Date()
  
  let daysToSubtract = 365
  if (timeRange === '30d') {
    daysToSubtract = 30
  } else if (timeRange === '7d') {
    daysToSubtract = 7
  } else if (timeRange === '180d') {
    daysToSubtract = 180
  }
  
  startDate.setDate(startDate.getDate() - daysToSubtract)
  
  try {
    // Use Yahoo Finance API (public endpoint, no auth required)
    // Calculate period1 (start timestamp) and period2 (end timestamp)
    const period1 = Math.floor(startDate.getTime() / 1000)
    const period2 = Math.floor(endDate.getTime() / 1000)
    
    const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/TSLA?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false`
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    })
    
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`)
    }
    
    const data = await response.json()
    
    // Parse Yahoo Finance response
    const result = data.chart?.result?.[0]
    if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) {
      throw new Error('Invalid data format from API')
    }
    
    const timestamps = result.timestamp
    const closes = result.indicators.quote[0].close
    
    // Convert to our format
    const stockData = timestamps
      .map((timestamp: number, index: number) => {
        const date = new Date(timestamp * 1000)
        const price = closes[index]
        
        if (!price || isNaN(price)) return null
        
        return {
          date: date.toISOString().split('T')[0],
          price: Math.round(price * 100) / 100,
        }
      })
      .filter((item: any) => item !== null && item.price > 0)
      .filter((item: any) => {
        const itemDate = new Date(item.date)
        return itemDate >= startDate && itemDate <= endDate
      })
    
    if (stockData.length === 0) {
      throw new Error('No data returned')
    }
    
    return NextResponse.json(stockData)
  } catch (error) {
    console.error('Error fetching Tesla stock data:', error)
    // Fallback to sample data
    return NextResponse.json(generateSampleTeslaData(startDate, endDate))
  }
}

// Generate realistic Tesla stock price data as fallback
function generateSampleTeslaData(startDate: Date, endDate: Date) {
  const data = []
  const currentDate = new Date(startDate)
  let basePrice = 200 // Starting price around $200
  
  // Simple seeded random for consistency
  let seed = 456
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  
  while (currentDate <= endDate) {
    // Skip weekends
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Simulate stock price movement with trend and volatility
      const progress = (currentDate.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())
      
      // Overall upward trend with some volatility
      const trend = 1 + progress * 0.3 // ~30% increase over the period
      const volatility = 0.95 + random() * 0.1 // ±5% daily volatility
      const price = basePrice * trend * volatility
      
      data.push({
        date: currentDate.toISOString().split('T')[0],
        price: Math.round(price * 100) / 100,
      })
    }
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return data
}
