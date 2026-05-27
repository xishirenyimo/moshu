import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QrCode } from 'lucide-react'

type IsbnScannerProps = {
  onScan: (isbn: string) => void
}

export function IsbnScanner({ onScan }: IsbnScannerProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannedRef = useRef(false)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) return
    const scanner = scannerRef.current
    scannerRef.current = null
    try { await scanner.stop() } catch { /* ignore */ }
    try { scanner.clear() } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!open) return

    scannedRef.current = false
    setError(null)
    let active = true

    const init = async () => {
      const scanner = new Html5Qrcode('isbn-scanner-viewport', {
        verbose: false,
        useBarCodeDetectorIfSupported: true,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      })

      if (!active) {
        scanner.clear()
        return
      }

      scannerRef.current = scanner

      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 60 },
          },
          (text) => {
            if (scannedRef.current) return
            scannedRef.current = true
            const digits = text.replace(/[^\dXx]/g, '')
            if (digits.length >= 10 && digits.length <= 13) {
              onScanRef.current(digits)
              setOpen(false)
              void stopScanner()
            }
          },
          () => { /* scan failure, ignore */ },
        )
      } catch (e: unknown) {
        if (!active) return
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes('NotAllowed') || msg.includes('Permission')) {
          setError('摄像头权限被拒绝，请在浏览器设置中允许访问摄像头')
        } else if (msg.includes('NotFound')) {
          setError('未检测到摄像头')
        } else {
          setError('无法启动扫码器: ' + msg)
        }
      }
    }

    const timeout = setTimeout(init, 300)
    return () => {
      active = false
      clearTimeout(timeout)
      void stopScanner()
    }
  }, [open, stopScanner])

  return (
    <>
      <Button type="button" variant="secondary" size="icon" onClick={() => setOpen(true)} title="扫描ISBN条形码">
        <QrCode className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>扫描 ISBN 条形码</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {error ? (
              <div className="text-center py-8">
                <p className="text-sm text-destructive mb-3">{error}</p>
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>关闭</Button>
              </div>
            ) : (
              <div id="isbn-scanner-viewport" className="[&>video]:rounded-lg overflow-hidden rounded-lg" />
            )}
            <p className="text-xs text-muted-foreground text-center">
              将书籍背面的条形码对准扫描框
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
