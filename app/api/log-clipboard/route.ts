import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { clipboardData, timestamp } = await request.json();
    
    // Parse the clipboard data to extract structured information
    const htmlFrameMatch = clipboardData.match(/## HTML Frame:\n([\s\S]*?)(?=\n## Code Location:|$)/);
    const codeLocationMatch = clipboardData.match(/## Code Location:\n([\s\S]*?)(?=\n<\/selected_element>|$)/);
    
    const htmlFrame = htmlFrameMatch ? htmlFrameMatch[1].trim() : null;
    const codeLocation = codeLocationMatch ? codeLocationMatch[1].trim() : null;
    
    // Log as simple structured object
    const clickedComponent = {
      htmlFrame,
      codeLocation,
      timestamp,
    };
    
    console.log('Clicked Component:', clickedComponent);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging clicked component:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log clicked component' },
      { status: 500 }
    );
  }
}
