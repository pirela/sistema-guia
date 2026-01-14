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

const generarCodigoBarras = async (texto: string): Promise<string> => {
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, texto, {
    format: 'CODE128',
    width: 2,
    height: 40,
    displayValue: true,
    fontSize: 12,
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

const truncarTexto = (doc: jsPDF, texto: string, maxWidth: number): string => {
  const palabras = texto.split(' ')
  let resultado = ''
  
  for (const palabra of palabras) {
    const prueba = resultado ? `${resultado} ${palabra}` : palabra
    const ancho = doc.getTextWidth(prueba)
    console.info("ancho", ancho)
    console.info("maxWidth", maxWidth)
    if (ancho > maxWidth) {
      return resultado ? `${resultado}...` : `${palabra.substring(0, palabra.length - 3)}...`
    }
    resultado = prueba
  }
  
  return resultado
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
    doc.setFontSize(14)
    doc.setFont('arial', 'bold')
    doc.text('RayoEntrega', pageWidth / 2, 8, { align: 'center' })
    
    doc.setFontSize(7)
    doc.setFont('arial', 'bold')
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
    
    doc.setFontSize(9)
    doc.setFont('arial', 'bold')
    doc.text(`GUÍA: ${guia.numero_guia}`, margin + 2, yPosition + 4)
    doc.text('PAQUETES: 1', rightColumn - 2, yPosition + 4, { align: 'right' })
    
    doc.setFontSize(7)
    doc.text(`TOTAL: $${formatearMoneda(guia.monto_recaudar)}`, pageWidth / 2, yPosition + 8, { align: 'center' })
    
    yPosition += 12

    doc.setDrawColor(41, 128, 185)
    doc.setLineWidth(0.3)
    doc.line(margin, yPosition, rightColumn, yPosition)
    yPosition += 4

    doc.setFontSize(7)
    doc.setFont('arial', 'bold')
    doc.setTextColor(52, 73, 94)
    doc.text('REMITENTE', margin, yPosition)
    yPosition += 4
    
    doc.setFont('arial', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Colombiaeasystore', margin + 2, yPosition)
    doc.text('ID Bodega: 34856', rightColumn - 2, yPosition, { align: 'right' })
    yPosition += 4
    doc.text('Bogotá, Colombia', margin + 2, yPosition)
    
    yPosition += 3

    doc.setDrawColor(41, 128, 185)
    doc.line(margin, yPosition, rightColumn, yPosition)
    yPosition += 4

    doc.setFont('arial', 'bold')
    doc.setTextColor(52, 73, 94)
    doc.text('DESTINATARIO', margin, yPosition)
    yPosition += 4
    
    doc.setFontSize(8)
    doc.setFont('arial', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(guia.nombre_cliente, margin + 2, yPosition)
    
    yPosition += 5

    doc.setFontSize(7)
    doc.setFont('arial', 'bold')
    doc.text('Cundinamarca, Bogotá', margin + 2, yPosition)
    
    yPosition += 5

    doc.setFont('arial', 'bold')
    doc.setTextColor(52, 73, 94)
    doc.text('Dirección:', margin + 2, yPosition)
    yPosition += 3.5
    
    doc.setFont('arial', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(6.5)
    const direccionSplit = doc.splitTextToSize(guia.direccion, pageWidth - 2 * margin - 4)
    doc.text(direccionSplit, margin + 2, yPosition)
    yPosition += (direccionSplit.length * 3.5) + 2
    
    doc.setFontSize(7)
    doc.setFont('arial', 'bold')
    doc.setTextColor(52, 73, 94)
    doc.text('Tel:', margin + 2, yPosition)
    doc.setFont('arial', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(guia.telefono_cliente, margin + 8, yPosition)
    
    yPosition += 3

    doc.setDrawColor(41, 128, 185)
    doc.line(margin, yPosition, rightColumn, yPosition)
    yPosition += 4

    doc.setFontSize(7)
    doc.setFont('arial', 'bold')
    doc.setTextColor(52, 73, 94)
    doc.text('CONTENIDO DEL PAQUETE', margin, yPosition)
    yPosition += 4
    
    doc.setFillColor(249, 249, 249)
    const productosHeight = guia.productos.length * 5
    doc.rect(margin, yPosition, pageWidth - 2 * margin, productosHeight, 'F')
    
    yPosition += 3
    
    doc.setFontSize(5.5)
    doc.setFont('arial', 'bold')
    doc.setTextColor(0, 0, 0)
    
    guia.productos.forEach((prod) => {
      const productoTexto = `• ${prod.producto.nombre}`
      //const maxWidth = pageWidth - 2 * margin - 30
      const productoTruncado = truncarTexto(doc, productoTexto, 52).toLowerCase()
      doc.text(productoTruncado, margin + 2, yPosition)
      
      doc.setFont('arial', 'bold')
      doc.text(`x${prod.cantidad}`, rightColumn - 8, yPosition)
      doc.setFont('arial', 'bold')
      
      yPosition += 4
    })

    //yPosition += 1

    if (guia.observacion) {
      doc.setDrawColor(41, 128, 185)
      doc.line(margin, yPosition, rightColumn, yPosition)
      yPosition += 4
      
      doc.setFontSize(7)
      doc.setFont('arial', 'bold')
      doc.setTextColor(52, 73, 94)
      doc.text('OBSERVACIONES', margin, yPosition)
      yPosition += 4
      
      doc.setFont('arial', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(6)
      const obsSplit = doc.splitTextToSize(guia.observacion, pageWidth - 2 * margin - 4)
      doc.text(obsSplit, margin + 2, yPosition)
      yPosition += (obsSplit.length * 3) + 2
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
    doc.setFontSize(6)
    doc.setFont('arial', 'bold')
    doc.text('contacto@rayoentrega.com', pageWidth / 2, 148, { align: 'center' })
    */
  }

  doc.save(`guias-asignadas-${new Date().toISOString().split('T')[0]}.pdf`)
}