"use client"

import { useState } from "react"
import { isDebugMode } from "@/lib/debug-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestDebugPage() {
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toISOString()}: ${info}`])
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Debug Mode Test</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Debug Mode Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Debug mode is currently: <strong>{isDebugMode() ? "ENABLED" : "DISABLED"}</strong>
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              To control debug mode, set <code>DEBUG_MODE=true</code> or <code>DEBUG_MODE=false</code> in your <code>.env.local</code> file.
            </p>
            <Button onClick={() => addDebugInfo("Test debug message added")}>
              Add Debug Info
            </Button>
          </CardContent>
        </Card>

        {/* Debug Box - Only shows when DEBUG_MODE=true */}
        {isDebugMode() && (
          <div className="fixed bottom-4 right-4 bg-blue-900/90 text-white p-4 rounded-lg max-w-md z-50">
            <h4 className="font-bold text-xs mb-2">🔍 Debug Test Box:</h4>
            <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
              {debugInfo.length === 0 ? (
                <div className="text-gray-300">No debug info yet. Click the button above!</div>
              ) : (
                debugInfo.map((info, index) => (
                  <div key={index} className="font-mono text-xs leading-tight">{info}</div>
                ))
              )}
            </div>
            <div className="text-xs mt-2 opacity-70 border-t border-blue-700 pt-1">
              Debug entries: {debugInfo.length}
            </div>
          </div>
        )}

        {!isDebugMode() && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                Debug boxes are hidden because DEBUG_MODE is disabled. 
                Set <code>DEBUG_MODE=true</code> in your .env.local file to see debug boxes.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 