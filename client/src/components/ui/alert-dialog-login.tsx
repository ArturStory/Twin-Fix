import React from "react"
import { useLocation } from "wouter"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface LoginAlertProps {
  open: boolean
  setOpen: (open: boolean) => void
  title?: string
  description?: string
}

export function LoginAlertDialog({
  open,
  setOpen,
  title = "Authentication Problem",
  description = "There seems to be an issue with the login system.",
}: LoginAlertProps) {
  const [, navigate] = useLocation()

  const goToEmergencyLogin = () => {
    setOpen(false)
    navigate("/emergency-login")
  }

  const goToEmergencyRegister = () => {
    setOpen(false)
    navigate("/emergency-register")
  }
  
  const goToAuthDebug = () => {
    setOpen(false)
    navigate("/auth-debug")
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {description}
            <p className="mt-2">
              We've provided alternative authentication options to help you access the system.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button onClick={goToEmergencyLogin} variant="default" className="w-full">
              Emergency Login
            </Button>
            <Button onClick={goToEmergencyRegister} variant="outline" className="w-full">
              Emergency Register
            </Button>
          </div>
          <Button onClick={goToAuthDebug} variant="ghost" className="w-full mt-2">
            Authentication Debug Tools
          </Button>
          <AlertDialogCancel className="mt-2 w-full">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}