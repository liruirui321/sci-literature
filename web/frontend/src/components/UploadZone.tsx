import { useCallback } from 'react'
import { Upload } from 'lucide-react'

interface Props {
  accept: string
  label: string
  onFile: (text: string) => void
}

export default function UploadZone({ accept, label, onFile }: Props) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) file.text().then(onFile)
  }, [onFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) file.text().then(onFile)
    e.target.value = ''
  }, [onFile])

  return (
    <div
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      className="border-2 border-dashed border-gray-600/50 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors cursor-pointer"
    >
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        id={`upload-${label}`}
      />
      <label htmlFor={`upload-${label}`} className="cursor-pointer">
        <Upload className="w-8 h-8 mx-auto text-gray-500 mb-3" />
        <p className="text-sm text-gray-300 font-medium">{label}</p>
        <p className="text-xs text-gray-500 mt-1">Drop file here or click to browse</p>
      </label>
    </div>
  )
}
