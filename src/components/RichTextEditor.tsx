import { useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (val: string) => void
  className?: string
}

export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const exec = (command: string, cmdValue?: string) => {
    document.execCommand(command, false, cmdValue)
    editorRef.current?.focus()
    handleInput()
  }

  return (
    <div className={cn('border rounded-md overflow-hidden bg-white', className)}>
      <div className="bg-gray-50 border-b p-1 flex gap-1 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => exec('bold')}
          className="h-8 px-2"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => exec('italic')}
          className="h-8 px-2"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => exec('underline')}
          className="h-8 px-2"
        >
          <Underline className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => exec('insertUnorderedList')}
          className="h-8 px-2"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => exec('insertOrderedList')}
          className="h-8 px-2"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        className="p-3 min-h-[100px] max-h-[300px] overflow-y-auto prose prose-sm max-w-none focus:outline-none"
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
      />
    </div>
  )
}
