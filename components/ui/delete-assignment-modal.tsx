"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2 } from "lucide-react"

interface DeleteAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  assignmentTitle: string
  submissionCount: number
  studentCount: number
  isDeleting: boolean
}

export function DeleteAssignmentModal({
  isOpen,
  onClose,
  onConfirm,
  assignmentTitle,
  submissionCount,
  studentCount,
  isDeleting
}: DeleteAssignmentModalProps) {
  const handleConfirm = async () => {
    await onConfirm()
  }

  const handleClose = () => {
    if (!isDeleting) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Assignment
          </DialogTitle>
          <DialogDescription>
            You are about to permanently delete the assignment "{assignmentTitle}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-red-800 font-medium mb-2">⚠️ This action will:</div>
            <ul className="text-red-700 text-sm space-y-1 list-disc list-inside">
              <li>Permanently delete the assignment</li>
              <li>Remove all {submissionCount} student submission{submissionCount !== 1 ? 's' : ''}</li>
              <li>Remove assignment from {studentCount} student{studentCount !== 1 ? 's' : ''}</li>
              <li>Cannot be undone</li>
            </ul>
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
            disabled={isDeleting}
            className="min-w-[100px]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Assignment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 