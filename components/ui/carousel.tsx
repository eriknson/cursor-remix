"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  autoPlay?: boolean
  autoPlayInterval?: number
  pauseOnHover?: boolean
}

export function Carousel({
  className,
  children,
  autoPlay = true,
  autoPlayInterval = 8000,
  pauseOnHover = true,
  ...props
}: CarouselProps) {
  const [isPaused, setIsPaused] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const scrollIntervalRef = React.useRef<NodeJS.Timeout | null>(null)
  const startXRef = React.useRef<number | null>(null)
  const scrollLeftRef = React.useRef<number>(0)
  const isDraggingRef = React.useRef(false)

  const childrenArray = React.Children.toArray(children)
  const totalItems = childrenArray.length

  // Auto-scroll functionality with slow animation
  React.useEffect(() => {
    if (!autoPlay || isPaused || totalItems <= 1) {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current)
        scrollIntervalRef.current = null
      }
      return
    }

    const scroll = () => {
      if (!containerRef.current || isDraggingRef.current) return

      const container = containerRef.current
      const maxScroll = container.scrollWidth - container.offsetWidth
      const currentScroll = container.scrollLeft

      // Scroll slowly - small increment for smooth slow animation
      // Scroll about 2% of container width per interval
      const scrollDistance = container.offsetWidth * 0.02

      // If we've reached the end, smoothly scroll back to start
      if (currentScroll >= maxScroll - 10) {
        container.scrollTo({
          left: 0,
          behavior: "smooth",
        })
      } else {
        container.scrollBy({
          left: scrollDistance,
          behavior: "smooth",
        })
      }
    }

    // Use a smaller interval for smooth continuous scrolling
    // The autoPlayInterval controls how fast we scroll, but we update more frequently for smoothness
    const updateInterval = Math.max(50, autoPlayInterval / 160) // Update frequently but respect the overall speed
    scrollIntervalRef.current = setInterval(scroll, updateInterval)

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current)
        scrollIntervalRef.current = null
      }
    }
  }, [autoPlay, autoPlayInterval, isPaused, totalItems])

  // Handle touch/swipe events
  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true
    startXRef.current = e.touches[0].pageX
    if (containerRef.current) {
      scrollLeftRef.current = containerRef.current.scrollLeft
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startXRef.current || !containerRef.current) return
    const x = e.touches[0].pageX
    const walk = (startXRef.current - x) * 2
    containerRef.current.scrollLeft = scrollLeftRef.current + walk
  }

  const handleTouchEnd = () => {
    isDraggingRef.current = false
    startXRef.current = null
    // Resume auto-scroll after a delay
    setTimeout(() => {
      if (!isPaused) {
        setIsPaused(false)
      }
    }, 1000)
  }

  // Handle mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    startXRef.current = e.pageX
    if (containerRef.current) {
      scrollLeftRef.current = containerRef.current.scrollLeft
      containerRef.current.style.cursor = "grabbing"
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!startXRef.current || !containerRef.current || !isDraggingRef.current) return
    e.preventDefault()
    const x = e.pageX
    const walk = (startXRef.current - x) * 2
    containerRef.current.scrollLeft = scrollLeftRef.current + walk
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
    startXRef.current = null
    if (containerRef.current) {
      containerRef.current.style.cursor = "grab"
    }
    // Resume auto-scroll after a delay
    setTimeout(() => {
      if (!isPaused) {
        setIsPaused(false)
      }
    }, 1000)
  }

  const handleMouseLeave = () => {
    isDraggingRef.current = false
    startXRef.current = null
    if (containerRef.current) {
      containerRef.current.style.cursor = "grab"
    }
  }

  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
      {...props}
    >
      <div
        ref={containerRef}
        className="flex overflow-x-auto scroll-smooth scrollbar-hide"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollBehavior: "smooth",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {childrenArray.map((child, index) => (
          <div
            key={index}
            className="flex-shrink-0"
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}
