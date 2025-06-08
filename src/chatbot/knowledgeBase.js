// const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
// const { Document } = require("langchain/document");
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
// const { MemoryVectorStore } = require("langchain/vectorstores/memory");
// const fs = require("fs");
// const path = require("path");
// const logger = require("../utils/logger");
// const pdfParse = require("pdf-parse");

// class KnowledgeBaseLoader {
//   constructor(apiKey) {
//     this.apiKey = apiKey;
//     this.embeddings = new GoogleGenerativeAIEmbeddings({
//       apiKey: apiKey,
//       modelName: "embedding-001",
//     });
//     this.textSplitter = new RecursiveCharacterTextSplitter({
//       chunkSize: 1000,
//       chunkOverlap: 200,
//     });
//   }

//   async loadFile(filePath) {
//     const text = fs.readFileSync(filePath, "utf8");
//     return new Document({
//       pageContent: text,
//       metadata: { source: filePath },
//     });
//   }

//   async loadFromDirectory(directoryPath) {
//     try {
//       logger.info(`Loading documents from ${directoryPath}`);
//       const documents = [];
//       const files = fs.readdirSync(directoryPath);

//       for (const file of files) {
//         const filePath = path.join(directoryPath, file);
//         if (file.endsWith(".txt") || file.endsWith(".md")) {
//           const text = fs.readFileSync(filePath, "utf8");
//           const doc = new Document({
//             pageContent: text,
//             metadata: { source: filePath },
//           });
//           documents.push(doc);
//         }
//       }

//       if (documents.length === 0) {
//         logger.warn("No documents found in the specified directory");
//         return [];
//       }

//       const splitDocs = await this.textSplitter.splitDocuments(documents);
//       logger.info(`Processed ${splitDocs.length} document chunks`);

//       return splitDocs;
//     } catch (error) {
//       logger.error("Error loading documents:", error);
//       throw error;
//     }
//   }

//   async processDocuments(documents) {
//     return await this.textSplitter.splitDocuments(documents);
//   }

//   async createVectorStore(documents) {
//     try {
//       return await MemoryVectorStore.fromDocuments(documents, this.embeddings);
//     } catch (error) {
//       logger.error("Error creating vector store:", error);
//       throw error;
//     }
//   }
// }

// module.exports = KnowledgeBaseLoader;



const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { Document } = require("langchain/document");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const pdfParse = require("pdf-parse");

class KnowledgeBaseLoader {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: apiKey,
      modelName: "embedding-001",
    });
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }

  async loadFile(filePath) {
    const text = fs.readFileSync(filePath, "utf8");
    return new Document({
      pageContent: text,
      metadata: { source: filePath },
    });
  }

  async loadFromDirectory(directoryPath) {
    try {
      logger.info(`Loading documents from ${directoryPath}`);
      const documents = [];
      const files = fs.readdirSync(directoryPath);
  
      for (const file of files) {
        const filePath = path.join(directoryPath, file);
  
        if (file.endsWith(".txt") || file.endsWith(".md")) {
          const text = fs.readFileSync(filePath, "utf8");
          documents.push(new Document({ pageContent: text, metadata: { source: filePath } }));
        } else if (file.endsWith(".pdf")) {
          const dataBuffer = fs.readFileSync(filePath);
          const pdfData = await pdfParse(dataBuffer);
          documents.push(new Document({ pageContent: pdfData.text, metadata: { source: filePath } }));
        }
      }
  
      if (documents.length === 0) {
        logger.warn("No documents found in the specified directory");
        return [];
      }
  
      const splitDocs = await this.textSplitter.splitDocuments(documents);
      logger.info(`Processed ${splitDocs.length} document chunks`);
  
      return splitDocs;
    } catch (error) {
      logger.error("Error loading documents:", error);
      throw error;
    }
  }

  async processDocuments(documents) {
    return await this.textSplitter.splitDocuments(documents);
  }

  async createVectorStore(documents) {
    try {
      return await MemoryVectorStore.fromDocuments(documents, this.embeddings);
    } catch (error) {
      logger.error("Error creating vector store:", error);
      throw error;
    }
  }
}

module.exports = KnowledgeBaseLoader;
