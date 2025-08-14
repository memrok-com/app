#!/usr/bin/env bun

import { QdrantService } from '../server/services/qdrant-service'

console.log('Environment check:')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('MEMROK_VECTORS_DOMAIN:', process.env.MEMROK_VECTORS_DOMAIN)
console.log('QDRANT_API_KEY:', process.env.QDRANT_API_KEY ? '[SET]' : '[NOT SET]')

const service = new QdrantService('debug-user')

console.log('\nTesting health check...')
service.healthCheck()
  .then(healthy => {
    console.log('Health check result:', healthy)
  })
  .catch(error => {
    console.error('Health check error:', error)
  })