import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// GET /api/theme - Get current user's theme accent color
export async function GET() {
  try {
    const supabase = await createServerClient()
    
    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      )
    }

    // Get user's theme accent color from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('theme_accent_color')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user theme:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch theme preference' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      theme_accent_color: profile?.theme_accent_color || 'purple'
    })
  } catch (error) {
    console.error('Error in GET /api/theme:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/theme - Update current user's theme accent color
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { theme_accent_color } = body

    // Validate the accent color (basic validation)
    if (!theme_accent_color || typeof theme_accent_color !== 'string') {
      return NextResponse.json(
        { error: 'Invalid theme_accent_color provided' },
        { status: 400 }
      )
    }

    // Optionally validate against allowed colors (you can expand this list)
    const allowedColors = [
      'purple', 'blue', 'green', 'red', 'orange', 'yellow', 
      'pink', 'indigo', 'teal', 'cyan', 'slate', 'gray'
    ]
    
    if (!allowedColors.includes(theme_accent_color)) {
      return NextResponse.json(
        { error: 'Invalid accent color. Must be one of: ' + allowedColors.join(', ') },
        { status: 400 }
      )
    }

    // Update user's theme accent color
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ theme_accent_color })
      .eq('id', session.user.id)

    if (updateError) {
      console.error('Error updating user theme:', updateError)
      return NextResponse.json(
        { error: 'Failed to update theme preference' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      theme_accent_color
    })
  } catch (error) {
    console.error('Error in PATCH /api/theme:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 