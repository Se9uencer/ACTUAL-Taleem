"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useState } from "react"

interface DeleteClassModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  className: string
  studentCount: number
  isDeleting: boolean
}

export function DeleteClassModal({
  isOpen,
  onClose,
  onConfirm,
  className,
  studentCount,
  isDeleting
}: DeleteClassModalProps) {
  const [confirmText, setConfirmText] = useState("")
  const requiredText = "DELETE"

  const handleConfirm = async () => {
    if (confirmText === requiredText) {
      await onConfirm()
      setConfirmText("") // Reset the confirmation text
    }
  }

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText("")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Class
          </DialogTitle>
          <DialogDescription>
            You are about to permanently delete the class "{className}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-red-800 font-medium mb-2">⚠️ This action will:</div>
            <ul className="text-red-700 text-sm space-y-1 list-disc list-inside">
              <li>Permanently delete the class and all its assignments</li>
              <li>Remove all student submissions and feedback</li>
              <li>Notify {studentCount} enrolled student{studentCount !== 1 ? 's' : ''}</li>
              <li>Cannot be undone</li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-sm">
              To confirm, type <span className="font-mono bg-gray-100 px-1 rounded">DELETE</span> below:
            </div>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Type DELETE to confirm"
              disabled={isDeleting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={confirmText !== requiredText || isDeleting}
            className="min-w-[100px]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Class"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 