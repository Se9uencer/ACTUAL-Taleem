import { TaleemLogo } from "@/components/taleem-logo"
import { dynamicAccent } from "@/lib/accent-utils"

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <TaleemLogo className={`h-12 w-auto ${dynamicAccent.icon.primary} mb-4`} />
      <p className="text-gray-700 mb-2">Loading your classes...</p>
      <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${dynamicAccent.button.primary} animate-pulse`}></div>
      </div>
    </div>
  )
}
