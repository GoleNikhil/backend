const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const KnowledgeBaseLoader = require("../chatbot/knowledgeBase");
const logger = require("../utils/logger");
const path = require("path");
require("dotenv").config();

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error("Missing GOOGLE_API_KEY in environment variables");
}

let vectorStore = null;
let genAI = null;
let model = null;
let isInitialized = false;

// Custom function to use Google's Gemini directly with retrieved documents
const processWithGemini = async (question, documents) => {
  try {
    if (!documents || documents.length === 0) {
      return { answer: "I don't have enough information to answer that question." };
    }

    // Extract text content from documents
    const contextText = documents.map(doc => doc.pageContent).join("\n\n");

    // Create the prompt with context and question
    const prompt = `
      You are an AI assistant for AVNS. Use the following pieces of context to answer the question.
      If you don't know the answer, just say that you don't know and suggest contacting support.
      Don't try to make up an answer.

      Context: ${contextText}
      
      Question: ${question}
      
      Answer in a helpful and professional tone:
    `;

    // Generate content using Google Gemini
    const result = await model.generateContent(prompt);
    const response = result.response;
    return { answer: response.text() };
  } catch (error) {
    logger.error("Error processing with Gemini:", error);
    throw error;
  }
};

const initializeChatbot = async (apiKey) => {
  try {
    if (!apiKey) {
      throw new Error("Google API key is required");
    }

    // Initialize Google Generative AI directly
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        topP: 0.8,
        topK: 40,
      },
    });

    // Load knowledge base
    const loader = new KnowledgeBaseLoader(apiKey);
    const documents = await loader.loadFromDirectory(
      path.join(__dirname, "../chatbot/data/docs")
    );

    if (!documents || documents.length === 0) {
      throw new Error("No documents found in knowledge base");
    }

    vectorStore = await loader.createVectorStore(documents);

    isInitialized = true;
    logger.info("Chatbot initialized successfully with Gemini model");
  } catch (error) {
    logger.error("Error initializing chatbot:", error);
    isInitialized = false;
    throw error;
  }
};

const handleChat = async (req, res) => {
  try {
    if (!isInitialized || !model || !vectorStore) {
      logger.error("Attempting to use uninitialized chatbot");
      throw new Error(
        "Chatbot not initialized. Please try again in a few moments."
      );
    }

    const { message } = req.body;
    
    // Use the vector store to retrieve relevant documents
    const retriever = vectorStore.asRetriever();
    const documents = await retriever.getRelevantDocuments(message);
    
    // Process with Gemini
    const response = await processWithGemini(message, documents);

    res.json({
      response: response.answer,
      timestamp: new Date().toISOString(),
      model: "gemini-2.0-flash",
    });
  } catch (error) {
    logger.error("Error in chat handler:", error);
    if (error.message.includes("quota")) {
      res.status(429).json({
        error: "API quota exceeded",
        message: "Please try again later",
      });
    } else {
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
      });
    }
  }
};

const getStatus = (req, res) => {
  res.json({
    initialized: isInitialized,
    documentsLoaded: vectorStore !== null,
    ready: isInitialized && model !== null && vectorStore !== null,
    model: "gemini-pro",
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  initializeChatbot,
  handleChat,
  getStatus,
};