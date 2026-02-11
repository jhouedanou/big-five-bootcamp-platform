"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from '@/components/ui/button'
import { 
    Bold, 
    Italic, 
    Underline as UnderlineIcon, 
    List, 
    ListOrdered, 
    Quote,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Link as LinkIcon,
    Undo,
    Redo
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
    content?: string
    onChange?: (content: string) => void
    placeholder?: string
    className?: string
    name?: string
}

export function RichTextEditor({ 
    content = '', 
    onChange, 
    placeholder = 'Commencez à écrire...',
    className,
    name
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [2, 3]
                }
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline'
                }
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph']
            }),
            Placeholder.configure({
                placeholder
            })
        ],
        content,
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert max-w-none min-h-[150px] p-4 focus:outline-none'
            }
        },
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML())
        }
    })

    if (!editor) return null

    const addLink = () => {
        const url = window.prompt('URL du lien:')
        if (url) {
            editor.chain().focus().setLink({ href: url }).run()
        }
    }

    return (
        <div className={cn("border rounded-lg overflow-hidden bg-background", className)}>
            {/* Toolbar */}
            <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/50">
                {/* Undo/Redo */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="h-8 w-8 p-0"
                >
                    <Undo className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="h-8 w-8 p-0"
                >
                    <Redo className="h-4 w-4" />
                </Button>

                <div className="w-px h-6 bg-border mx-1 self-center" />

                {/* Text formatting */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={cn("h-8 w-8 p-0", editor.isActive('bold') && 'bg-accent')}
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={cn("h-8 w-8 p-0", editor.isActive('italic') && 'bg-accent')}
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={cn("h-8 w-8 p-0", editor.isActive('underline') && 'bg-accent')}
                >
                    <UnderlineIcon className="h-4 w-4" />
                </Button>

                <div className="w-px h-6 bg-border mx-1 self-center" />

                {/* Lists */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={cn("h-8 w-8 p-0", editor.isActive('bulletList') && 'bg-accent')}
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={cn("h-8 w-8 p-0", editor.isActive('orderedList') && 'bg-accent')}
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={cn("h-8 w-8 p-0", editor.isActive('blockquote') && 'bg-accent')}
                >
                    <Quote className="h-4 w-4" />
                </Button>

                <div className="w-px h-6 bg-border mx-1 self-center" />

                {/* Alignment */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: 'left' }) && 'bg-accent')}
                >
                    <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: 'center' }) && 'bg-accent')}
                >
                    <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: 'right' }) && 'bg-accent')}
                >
                    <AlignRight className="h-4 w-4" />
                </Button>

                <div className="w-px h-6 bg-border mx-1 self-center" />

                {/* Link */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addLink}
                    className={cn("h-8 w-8 p-0", editor.isActive('link') && 'bg-accent')}
                >
                    <LinkIcon className="h-4 w-4" />
                </Button>
            </div>

            {/* Editor */}
            <EditorContent editor={editor} />

            {/* Hidden input for form submission */}
            {name && (
                <input
                    type="hidden"
                    name={name}
                    value={editor.getHTML()}
                />
            )}
        </div>
    )
}
