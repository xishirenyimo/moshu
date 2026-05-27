import { z } from 'zod'

export const bookFormSchema = z.object({
  isbn: z.string().optional(),
  title: z.string().min(1, '请输入书名'),
  authorName: z.string().optional(),
  authorNationality: z.string().optional(),
  publisher: z.string().optional(),
  language: z.string().optional(),
  totalPages: z.preprocess(
    (v) => (v === '' || Number.isNaN(v) ? undefined : v),
    z.number().int().positive('总页数必须大于0').optional().nullable(),
  ),
  currentPage: z.preprocess(
    (v) => (v === '' || Number.isNaN(v) ? undefined : v),
    z.number().int().min(0, '当前页码不能为负').optional().nullable(),
  ),
  readingStatus: z.enum(['未读', '在读', '已读', '弃读']).optional(),
  purchaseStatus: z.enum(['未购', '已购']).optional(),
  noteStatus: z.enum(['未进行', '进行中', '已完成']).optional(),
  notes: z.string().optional(),
  rating: z.number().int().min(0).max(5).optional().nullable(),
  tagNames: z.array(z.string()).optional(),
})

export type BookFormInput = z.infer<typeof bookFormSchema>
