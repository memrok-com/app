import { QdrantClient } from '@qdrant/js-client-rest'

const client = new QdrantClient({ 
  url: 'http://localhost:6333'
})

console.log('Testing Qdrant connection...')
client.getCollections()
  .then(result => {
    console.log('Success!', result)
  })
  .catch(error => {
    console.error('Error:', error)
  })