/**
 * Helper functions for managing user theme accent colors
 */

export const AVAILABLE_ACCENT_COLORS = [
  'purple', 'blue', 'green', 'red', 'orange', 'teal'
] as const

export type AccentColor = typeof AVAILABLE_ACCENT_COLORS[number]

export interface ThemeAccentResponse {
  theme_accent_color: string
}

export interface UpdateThemeAccentResponse {
  success: boolean
  theme_accent_color: string
}

/**
 * Get the current user's theme accent color
 * @returns Promise with the user's accent color or 'purple' as default
 */
export async function getUserThemeAccentColor(): Promise<string> {
  try {
    const response = await fetch('/api/theme', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch theme accent color:', response.statusText)
      return 'purple' // Default fallback
    }

    const data: ThemeAccentResponse = await response.json()
    return data.theme_accent_color || 'purple'
  } catch (error) {
    console.error('Error fetching theme accent color:', error)
    return 'purple' // Default fallback
  }
}

/**
 * Update the current user's theme accent color
 * @param accentColor - The new accent color to set
 * @returns Promise with the updated theme response
 */
export async function updateUserThemeAccentColor(
  accentColor: AccentColor
): Promise<UpdateThemeAccentResponse | null> {
  try {
    const response = await fetch('/api/theme', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme_accent_color: accentColor
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update theme accent color')
    }

    const data: UpdateThemeAccentResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error updating theme accent color:', error)
    throw error
  }
}

/**
 * Get the current user's theme accent color directly from Supabase (client-side)
 * @param supabase - Supabase client instance
 * @returns Promise with the user's accent color or 'purple' as default
 */
export async function getUserThemeAccentColorDirect(supabase: any): Promise<string> {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return 'purple' // Default for unauthenticated users
    }

    // Get user's theme accent color from profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('theme_accent_color')
      .eq('id', session.user.id)
      .single()

    if (error) {
      console.error('Error fetching theme accent color from Supabase:', error)
      return 'purple' // Default fallback
    }

    return profile?.theme_accent_color || 'purple'
  } catch (error) {
    console.error('Error in getUserThemeAccentColorDirect:', error)
    return 'purple' // Default fallback
  }
}

/**
 * Update the current user's theme accent color directly via Supabase (client-side)
 * @param supabase - Supabase client instance
 * @param accentColor - The new accent color to set
 * @returns Promise with success boolean
 */
export async function updateUserThemeAccentColorDirect(
  supabase: any, 
  accentColor: AccentColor
): Promise<boolean> {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('User not authenticated')
    }

    // Update user's theme accent color
    const { error } = await supabase
      .from('profiles')
      .update({ theme_accent_color: accentColor })
      .eq('id', session.user.id)

    if (error) {
      console.error('Error updating theme accent color in Supabase:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateUserThemeAccentColorDirect:', error)
    return false
  }
}

/**
 * Check if a color is a valid accent color
 * @param color - Color string to validate
 * @returns boolean indicating if the color is valid
 */
export function isValidAccentColor(color: string): color is AccentColor {
  return AVAILABLE_ACCENT_COLORS.includes(color as AccentColor)
} 