import jsPDF from 'jspdf'
import { Guia, Usuario, Producto } from '@/types/database'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'

interface GuiaProductoDetalle {
  producto: Producto
  cantidad: number
}

interface GuiaCompleta extends Guia {
  motorizado: Usuario
  productos: GuiaProductoDetalle[]
}

const formatearMoneda = (valor: number): string => {
  return valor.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Escala global de texto (+15%) para impresión térmica */
const ESCALA_TEXTO_IMPRESION = 1.15
/** Tamaño de fuente en pt (jsPDF) escalado */
const fz = (pt: number): number => Math.round(pt * ESCALA_TEXTO_IMPRESION * 10) / 10
/** Espaciado vertical en mm escalado (alineado al +15% del texto) */
const mmEsc = (mm: number): number => Math.round(mm * ESCALA_TEXTO_IMPRESION * 100) / 100

const FUENTE_TERMICA = 'helvetica' as const

const generarCodigoBarras = async (texto: string): Promise<string> => {
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, texto, {
    format: 'CODE128',
    width: mmEsc(2),
    height: Math.round(40 * ESCALA_TEXTO_IMPRESION),
    displayValue: true,
    fontSize: fz(12),
    margin: 5
  })
  return canvas.toDataURL('image/png')
}

const generarCodigoQR = async (texto: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(texto, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
  } catch (error) {
    console.error('Error generando QR:', error)
    return ''
  }
}

const cargarLogo = async (): Promise<string> => {
  try {
    const response = await fetch('/logo2.png')
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error cargando logo:', error)
    return ''
  }
}

/** Quita emoticones y pictogramas: las fuentes estándar de jsPDF no los dibujan bien. */
const quitarEmojisYPictogramas = (texto: string): string => {
  return texto
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\uFE0F\u200D]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export const generarPDFGuiasAsignadas = async (guias: GuiaCompleta[]) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [100, 150]
  })
  
  const logoImg = await cargarLogo()
  
  for (let index = 0; index < guias.length; index++) {
    const guia = guias[index]
    
    if (index > 0) {
      doc.addPage([100, 150])
    }

    const pageWidth = 100
    const margin = 3
    const rightColumn = pageWidth - margin
    let yPosition = 8

    doc.setFillColor(41, 128, 185)
    //doc.rect(0, 0, pageWidth, 18, 'F')

    if (logoImg) {
      doc.addImage(logoImg, 'PNG', margin + 2, 3, 12, 12)
    }

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(fz(14))
    doc.setFont(FUENTE_TERMICA, 'bold')
    doc.text('RayoEntrega', pageWidth / 2, 8, { align: 'center' })
    
    doc.setFontSize(fz(7))
    doc.setFont(FUENTE_TERMICA, 'bold')
    const fechaGeneracion = new Date().toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    })
    doc.text(`Fecha: ${fechaGeneracion}`, pageWidth / 2, 13, { align: 'center' })

    doc.setTextColor(0, 0, 0)
    yPosition = 18

    doc.setFillColor(236, 240, 241)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F')
    
    doc.setFontSize(fz(9))
    doc.setFont(FUENTE_TERMICA, 'bold')
    doc.text(`GUÍA: ${guia.numero_guia}`, margin + 2, yPosition + 4)
    doc.text('PAQUETES: 1', rightColumn - 2, yPosition + 4, { align: 'right' })
    
    doc.setFontSize(fz(7))
    doc.text(`TOTAL: $${formatearMoneda(guia.monto_recaudar)}`, pageWidth / 2, yPosition + 8, { align: 'center' })
    
    yPosition += 12

    doc.setDrawColor(41, 128, 185)
    doc.setLineWidth(0.3)
    doc.line(margin, yPosition, rightColumn, yPosition)
    yPosition += 4

    doc.setFontSize(fz(7))
    doc.setFont(FUENTE_TERMICA, 'bold')
    doc.setTextColor(52, 73, 94)
    doc.text('REMITENTE', margin, yPosition)
    yPosition += 4
    
    doc.setFont(FUENTE_TERMICA, 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Colombiaeasystore', margin + 2, yPosition)
    doc.text('ID Bodega: 34856', rightColumn - 2, yPosition, { align: 'right' })
    yPosition += 4
    doc.text('Bogotá, Colombia', margin + 2, yPosition)
    
    yPosition += 3

    doc.setDrawColor(41, 128, 185)
    doc.line(margin, yPosition, rightColumn, yPosition)
    yPosition += 4

    doc.setFont(FUENTE_TERMICA, 'bold')
    doc.setTextColor(52, 73, 94)
    doc.text('DESTINATARIO', margin, yPosition)
    yPosition += 4
    
    doc.setFontSize(fz(8))
    doc.setFont(FUENTE_TERMICA, 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(guia.nombre_cliente, margin + 2, yPosition)
    
    yPosition += 5

    doc.setFontSize(fz(7))
    doc.setFont(FUENTE_TERMICA, 'bold')
    doc.text('Cundinamarca, Bogotá', margin + 2, yPosition)
    
    yPosition += 5

    doc.setFont(FUENTE_TERMICA, 'bold')
    doc.setTextColor(52, 73, 94)
    doc.text('Dirección:', margin + 2, yPosition)
    yPosition += mmEsc(3.5)
    
    doc.setFont(FUENTE_TERMICA, 'bold')
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(fz(6.5))
    const direccionSplit = doc.splitTextToSize(guia.direccion, pageWidth - 2 * margin - 4)
    doc.text(direccionSplit, margin + 2, yPosition)
    const lineHeightDireccion = mmEsc(3.5)
    yPosition += direccionSplit.length * lineHeightDireccion + 2
    
    doc.setFontSize(fz(7))
    doc.setFont(FUENTE_TERMICA, 'bold')
    doc.setTextColor(52, 73, 94)
    doc.text('Tel:', margin + 2, yPosition)
    doc.setFont(FUENTE_TERMICA, 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(guia.telefono_cliente, margin + 8, yPosition)
    
    yPosition += 3

    doc.setDrawColor(41, 128, 185)
    doc.line(margin, yPosition, rightColumn, yPosition)
    yPosition += 4

    doc.setFontSize(fz(7))
    doc.setFont(FUENTE_TERMICA, 'bold')
    doc.setTextColor(52, 73, 94)
    doc.text('CONTENIDO DEL PAQUETE', margin, yPosition)
    yPosition += 4
    
    doc.setFontSize(fz(5.5))
    doc.setFont(FUENTE_TERMICA, 'bold')
    doc.setTextColor(0, 0, 0)

    const colProductoX = margin + 2
    const anchoTextoProducto = Math.max(
      20,
      rightColumn - colProductoX - 14
    )

    const lineHeightProducto = mmEsc(3.2)
    const padSuperiorCaja = mmEsc(3)
    const gapEntreProductos = mmEsc(0.6)
    const padInferiorCaja = mmEsc(2)

    const bloquesProducto = guia.productos.map((prod) => {
      const nombreLimpio = quitarEmojisYPictogramas(prod.producto.nombre)
      const etiqueta = nombreLimpio.length > 0 ? nombreLimpio : '(sin nombre)'
      const lineas = doc.splitTextToSize(`• ${etiqueta}`, anchoTextoProducto)
      return { lineas, cantidad: prod.cantidad }
    })

    const productosHeight =
      padSuperiorCaja +
      padInferiorCaja +
      bloquesProducto.reduce((acc, b, idx) => {
        const altoBloque = b.lineas.length * lineHeightProducto
        const gap = idx < bloquesProducto.length - 1 ? gapEntreProductos : 0
        return acc + altoBloque + gap
      }, 0)

    doc.setFillColor(249, 249, 249)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, productosHeight, 'F')

    let yProd = yPosition + padSuperiorCaja
    bloquesProducto.forEach((bloque, idx) => {
      bloque.lineas.forEach((linea: string, i: number) => {
        doc.text(linea, colProductoX, yProd + i * lineHeightProducto)
      })
      doc.text(`x${bloque.cantidad}`, rightColumn - 8, yProd)
      const gap =
        idx < bloquesProducto.length - 1 ? gapEntreProductos : 0
      yProd += bloque.lineas.length * lineHeightProducto + gap
    })

    yPosition += productosHeight

    //yPosition += 1

    if (guia.observacion) {
      doc.setDrawColor(41, 128, 185)
      doc.line(margin, yPosition, rightColumn, yPosition)
      yPosition += 4
      
      doc.setFontSize(fz(7))
      doc.setFont(FUENTE_TERMICA, 'bold')
      doc.setTextColor(52, 73, 94)
      doc.text('OBSERVACIONES', margin, yPosition)
      yPosition += 4
      
      doc.setFont(FUENTE_TERMICA, 'bold')
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(fz(6))
      const obsSplit = doc.splitTextToSize(guia.observacion, pageWidth - 2 * margin - 4)
      const lineHeightObs = mmEsc(3)
      doc.text(obsSplit, margin + 2, yPosition)
      yPosition += obsSplit.length * lineHeightObs + 2
    }

    yPosition += 3
    const codigoBarrasY = Math.max(yPosition, 118)
    const codigoBarrasImg = await generarCodigoBarras(guia.numero_guia)
    doc.addImage(codigoBarrasImg, 'PNG', margin, codigoBarrasY, 50, 15)

    const qrSize = 18
    const qrX = rightColumn - qrSize
    const qrY = codigoBarrasY
    const qrImg = await generarCodigoQR(`GUIA:${guia.numero_guia}|CLIENTE:${guia.nombre_cliente}|TOTAL:${guia.monto_recaudar}`)
    if (qrImg) {
      doc.addImage(qrImg, 'PNG', qrX, qrY, qrSize, qrSize)
    }

    doc.setFillColor(41, 128, 185)
    doc.rect(0, 147, pageWidth, 3, 'F')
    /*
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(fz(6))
    doc.setFont(FUENTE_TERMICA, 'bold')
    doc.text('contacto@rayoentrega.com', pageWidth / 2, 148, { align: 'center' })
    */
  }

  doc.save(`guias-asignadas-${new Date().toISOString().split('T')[0]}.pdf`)
}