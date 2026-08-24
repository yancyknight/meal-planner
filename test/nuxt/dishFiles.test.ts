import { describe, it, expect } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import FileDropzone from '../../app/components/FileDropzone.vue'
import DishFileList from '../../app/components/DishFileList.vue'
import type { DishFile } from '../../shared/types/dishFile'

function drop(wrapper: Awaited<ReturnType<typeof mountSuspended>>, files: File[]) {
  return wrapper.find('[class*="border-dashed"]').trigger('drop', { dataTransfer: { files } })
}

describe('FileDropzone', () => {
  it('emits the dropped file when it passes the type and size checks', async () => {
    const wrapper = await mountSuspended(FileDropzone, {
      props: { allowedExtensions: ['pdf'], maxBytes: 1024 },
    })

    await drop(wrapper, [new File(['abc'], 'recipe.pdf', { type: 'application/pdf' })])

    const emitted = wrapper.emitted('select')
    expect(emitted).toHaveLength(1)
    expect((emitted![0]![0] as File[])[0]!.name).toBe('recipe.pdf')
  })

  it('rejects a disallowed extension and explains why', async () => {
    const wrapper = await mountSuspended(FileDropzone, {
      props: { allowedExtensions: ['pdf'], maxBytes: 1024 },
    })

    await drop(wrapper, [new File(['#!/bin/sh'], 'evil.sh', { type: 'application/x-sh' })])

    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.text()).toContain('evil.sh')
    expect(wrapper.text()).toContain('not supported')
  })

  it('rejects a file over maxBytes before it is emitted', async () => {
    const wrapper = await mountSuspended(FileDropzone, {
      props: { allowedExtensions: ['pdf'], maxBytes: 4 },
    })

    await drop(wrapper, [new File(['way too much content'], 'big.pdf', { type: 'application/pdf' })])

    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.text()).toContain('too large')
  })

  it('emits nothing while disabled', async () => {
    const wrapper = await mountSuspended(FileDropzone, {
      props: { allowedExtensions: ['pdf'], disabled: true },
    })

    await drop(wrapper, [new File(['abc'], 'recipe.pdf', { type: 'application/pdf' })])

    expect(wrapper.emitted('select')).toBeUndefined()
  })
})

const sampleFiles: DishFile[] = [
  {
    id: 7,
    dishId: 1,
    storedName: 'uuid-1.pdf',
    originalName: 'chicken-with-sauce.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    createdAt: '2026-08-24T10:00:00.000Z',
  },
]

registerEndpoint('/api/dishes/1/files', () => sampleFiles)
registerEndpoint('/api/dishes/2/files', () => [])

describe('DishFileList', () => {
  it('renders attached files with a download link and size', async () => {
    const wrapper = await mountSuspended(DishFileList, { props: { dishId: 1 } })
    await flushPromises()

    expect(wrapper.text()).toContain('chicken-with-sauce.pdf')
    expect(wrapper.text()).toContain('2 KB')
    expect(wrapper.find('a[href="/api/dish-files/7/download"]').exists()).toBe(true)
  })

  it('shows an empty state when the dish has no files', async () => {
    const wrapper = await mountSuspended(DishFileList, { props: { dishId: 2 } })
    await flushPromises()

    expect(wrapper.text()).toContain('No files attached yet')
  })
})
