const { ChromaClient } = require("chromadb");
const path = require("path");

async function testChromaDB() {
  const client = new ChromaClient({
    path: path.join(process.cwd(), "data", "chromadb"),
  });

  try {
    // List all collections
    const collections = await client.listCollections();
    console.log("Available collections:", collections);

    if (collections.length > 0) {
      // Get the first collection
      const collection = await client.getCollection(collections[0].name);

      // Query the collection
      const result = await collection.query({
        nResults: 2,
        queryTexts: ["What services does AVNS offer?"],
      });

      console.log("Query results:", result);
    }
  } catch (error) {
    console.error("Error testing ChromaDB:", error);
  }
}

if (require.main === module) {
  testChromaDB().catch(console.error);
}
