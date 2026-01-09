import { SHOPIFY_CONFIG } from './shopify-config'

export interface ShopifyOrder {
  id: number
  order_number: number
  name: string
  note: string | null
  note_attributes: Array<{
    name: string
    value: string
  }>
  customer: {
    first_name: string
    last_name: string
    phone: string
    email: string
  }
  shipping_address: {
    address1: string
    address2: string | null
    city: string
    province: string
    zip: string
    country: string
  } | null
  billing_address: {
    address1?: string
    address2?: string | null
    city?: string
    province: string
    zip?: string
    country: string
    country_code: string
    province_code: string
  } | null
  line_items: Array<{
    id: number
    title: string
    quantity: number
    price: string
    sku: string | null
  }>
  total_price: string
  current_total_price: string
  financial_status: string
  fulfillment_status: string | null
  created_at: string
}

export async function obtenerOrdenShopify(orderNumber: string): Promise<ShopifyOrder | null> {
  try {
    const cleanOrderNumber = orderNumber.replace('#', '').trim()
    console.info(`-------------> https://${SHOPIFY_CONFIG.shop}/admin/api/${SHOPIFY_CONFIG.apiVersion}/orders.json?name=%23${cleanOrderNumber}`)
    console.info("SHOPIFY_CONFIG.accessToken", SHOPIFY_CONFIG.accessToken)
    const response = await fetch(
      `https://${SHOPIFY_CONFIG.shop}/admin/api/${SHOPIFY_CONFIG.apiVersion}/orders.json?name=%23${cleanOrderNumber}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_CONFIG.accessToken
        }
      }
    )
    console.log("response", response)
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.orders && data.orders.length > 0 ? data.orders[0] : null
  } catch (error) {
    console.error('Error obteniendo orden de Shopify:', error)
    throw error
  }
}