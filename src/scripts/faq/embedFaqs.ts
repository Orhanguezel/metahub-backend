import { Pinecone } from '@pinecone-database/pinecone';

const run = async () => {

  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

  await index.namespace('default').upsert([
    {
      id: 'test1',
      values: [0.5, 1.2, 0.9, -0.3],
      metadata: { category: 'faq' },
    },
    {
      id: 'test2',
      values: [1.5, -0.2, 0.1, 0.4],
      metadata: { category: 'faq' },
    },
  ]);

  const result = await index.namespace('default').query({
    topK: 1,
    vector: [0.5, 1.2, 0.9, -0.3],
    includeValues: true,
    includeMetadata: true,
    filter: {
      category: { $eq: 'faq' },
    },
  });

  console.log(JSON.stringify(result, null, 2));
};

run();
