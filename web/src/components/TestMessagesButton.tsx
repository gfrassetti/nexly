"use client"

import { useState } from "react"

export function TestMessagesButton() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const createTestMessages = async () => {
    setLoading(true)
    try {
      // Crear mensajes de prueba para los últimos 7 días
      const today = new Date()
      const messages = []
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        
        // Crear algunos mensajes para cada día
        const sentCount = Math.floor(Math.random() * 10) + 1
        const receivedCount = Math.floor(Math.random() * 8) + 1
        
        // Crear mensajes enviados
        for (let j = 0; j < sentCount; j++) {
          messages.push({
            direction: 'out',
            createdAt: new Date(date.getTime() + j * 60000), // 1 minuto entre mensajes
            content: `Mensaje de prueba enviado ${j + 1}`,
            provider: 'whatsapp'
          })
        }
        
        // Crear mensajes recibidos
        for (let j = 0; j < receivedCount; j++) {
          messages.push({
            direction: 'in',
            createdAt: new Date(date.getTime() + (j + sentCount) * 60000),
            content: `Mensaje de prueba recibido ${j + 1}`,
            provider: 'whatsapp'
          })
        }
      }

      // Enviar al backend (necesitarías crear un endpoint para esto)
      console.log('Mensajes de prueba creados:', messages.length)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error creando mensajes de prueba:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={createTestMessages}
      disabled={loading}
      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm transition-colors"
    >
      {loading ? 'Creando...' : success ? '¡Creados!' : 'Crear Mensajes de Prueba'}
    </button>
  )
}
