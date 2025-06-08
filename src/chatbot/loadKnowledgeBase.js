// src/chatbot/loadKnowledgeBase.js
const KnowledgeBaseLoader = require("./knowledgeBase");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Create directories for data
const dataPath = path.join(process.cwd(), "data");
const chromaDbPath = path.join(dataPath, "chromadb");
const docsPath = path.join(dataPath, "docs");

// Ensure ChromaDB directory exists and is empty
if (fs.existsSync(chromaDbPath)) {
  fs.rmSync(chromaDbPath, { recursive: true });
}
fs.mkdirSync(chromaDbPath, { recursive: true });

// Ensure directories exist
[dataPath, docsPath].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Add sample documentation if none exists
const createSampleDocs = () => {
  if (fs.readdirSync(docsPath).length === 0) {
    const sampleContent = `
# AVNS Product Information

## Products and Services
- Web Development
- Mobile App Development
- Cloud Solutions
- IT Consulting

## Common Questions
1. What services do you offer?
2. How can I request a quote?
3. What are your support hours?
4. How do I contact technical support?

## Contact Information
- Email: support@avns.com
- Phone: 1-800-AVNS
- Hours: Monday-Friday 9AM-5PM EST
    `;

    fs.writeFileSync(path.join(docsPath, "product-info.md"), sampleContent);
  }
};

async function main() {
  const openAIApiKey = process.env.OPENAI_API_KEY;
  if (!openAIApiKey) {
    console.error("Missing OPENAI_API_KEY environment variable");
    process.exit(1);
  }

  try {
    // Create sample documentation
    createSampleDocs();

    const loader = new KnowledgeBaseLoader(openAIApiKey);
    console.log("Loading documents...");
    const documents = await loader.loadFromDirectory(docsPath);

    console.log(`Creating vector store from ${documents.length} documents...`);
    const vectorStore = await loader.createVectorStore(documents);

    // Verify the collection was created
    const collections = await loader.chromaClient.listCollections();
    console.log("Available collections:", collections);

    return vectorStore;
  } catch (error) {
    console.error("Error creating knowledge base:", error);
    throw error;
  }
}

// Export for use in other files
module.exports = main;

// Run directly if called from command line
if (require.main === module) {
  main().catch(console.error);
}
