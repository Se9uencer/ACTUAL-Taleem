"use client"

import { useState } from "react"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { AccentColorSelector } from "@/components/ui/accent-color-selector"
import { AccentColorDemo } from "@/components/ui/accent-color-demo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { dynamicAccent } from "@/lib/accent-utils"
import { Input } from "@/components/ui/input"

export default function ThemeDemoPage() {
  const [inputValue, setInputValue] = useState("")

  return (
    <AuthenticatedLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Dynamic Theme Demo</h1>
          <p className="text-muted-foreground">
            Test how your selected accent color applies across different components
          </p>
        </div>

        {/* Color Selector */}
        <Card>
          <CardHeader>
            <CardTitle>🎨 Accent Color Selector</CardTitle>
          </CardHeader>
          <CardContent>
            <AccentColorSelector />
          </CardContent>
        </Card>

        {/* Buttons Demo */}
        <Card>
          <CardHeader>
            <CardTitle>🔘 Buttons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button className={dynamicAccent.button.primary}>
                Primary Button
              </Button>
              <Button className={dynamicAccent.button.secondary}>
                Secondary Button  
              </Button>
              <Button className={dynamicAccent.button.outline}>
                Outline Button
              </Button>
              <Button variant="destructive">
                Destructive Button
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Form Elements Demo */}
        <Card>
          <CardHeader>
            <CardTitle>📝 Form Elements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Dynamic Focus Input
                </label>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Focus me to see accent color"
                  className={dynamicAccent.input.focus}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Regular Input
                </label>
                <Input
                  placeholder="Normal input for comparison"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges Demo */}
        <Card>
          <CardHeader>
            <CardTitle>🏷️ Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Badge className={dynamicAccent.badge.primary}>
                Primary Badge
              </Badge>
              <Badge className={dynamicAccent.badge.solid}>
                Solid Badge
              </Badge>
              <Badge variant="secondary">
                Secondary Badge
              </Badge>
              <Badge variant="destructive">
                Destructive Badge
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Links Demo */}
        <Card>
          <CardHeader>
            <CardTitle>🔗 Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <a href="#" className={dynamicAccent.link.primary}>
                  Dynamic Accent Link
                </a>
              </div>
              <div>
                <a href="#" className={dynamicAccent.link.underline}>
                  Dynamic Accent Link with Underline
                </a>
              </div>
              <div>
                <a href="#" className="text-blue-600 hover:text-blue-800">
                  Regular Blue Link (for comparison)
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading States Demo */}
        <Card>
          <CardHeader>
            <CardTitle>⏳ Loading States</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-8 items-center">
              <div className="space-y-2">
                <p className="text-sm font-medium">Dynamic Spinner</p>
                <div className={`w-8 h-8 ${dynamicAccent.spinner.ring} rounded-full animate-spin`}></div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Dynamic Border Spinner</p>
                <div className={`w-8 h-8 ${dynamicAccent.spinner.border} rounded-full animate-spin`}></div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Regular Spinner</p>
                <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Colors Reference */}
        <Card>
          <CardHeader>
            <CardTitle>🎭 Available Colors</CardTitle>
          </CardHeader>
          <CardContent>
            <AccentColorDemo />
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle>⚙️ Technical Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm space-y-2">
              <p><strong>Current CSS Variables:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><code>--primary</code>: The main accent color</li>
                <li><code>--primary-foreground</code>: Text color on accent background</li>
                <li><code>--accent</code>: Alias for primary</li>
                <li><code>--accent-light</code>: Light version (10% opacity)</li>
                <li><code>--accent-medium</code>: Medium version (20% opacity)</li>
                <li><code>--accent-hover</code>: Hover state (90% opacity)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
} 