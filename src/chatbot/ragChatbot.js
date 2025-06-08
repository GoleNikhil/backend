// ragChatbot.js
import { ChatOpenAI } from "@langchain/openai";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { BufferMemory } from "langchain/memory";
import { PromptTemplate } from "@langchain/core/prompts";

export class CustomerSupportChatbot {
  constructor(openAIApiKey) {
    this.llm = new ChatOpenAI({
      openAIApiKey: openAIApiKey,
      modelName: "gpt-3.5-turbo",
      temperature: 0.7,
    });

    this.memory = new BufferMemory({
      memoryKey: "chat_history",
      returnMessages: true,
      inputKey: "question",
      outputKey: "text",
    });
  }

  // Initialize with a vector store
  async initialize(vectorStore, companyInfo) {
    this.companyInfo = companyInfo || {
      name: "Our Company",
      products: "our products",
      supportPolicy: "provide accurate and helpful information",
    };

    // Create the QA chain with our custom prompts
    const condenseQuestionTemplate = `
    Given the following conversation and a follow up question, rephrase the follow up question 
    to be a standalone question that captures all relevant context from the conversation.

    Chat History:
    {chat_history}
    
    Follow Up Input: {question}
    Standalone question:`;
    
    const qaTemplate = `
    You are a helpful customer support assistant for ${this.companyInfo.name}.
    
    Your goal is to ${this.companyInfo.supportPolicy}.
    
    Answer the question based on the context provided below. If the answer cannot be found in 
    the context, acknowledge that you don't have that specific information but try to be helpful and suggest
    the user contact support if appropriate.
    
    Context: {context}
    
    Question: {question}
    
    Answer:`;

    const qaPrompt = PromptTemplate.fromTemplate(qaTemplate);
    const condenseQuestionPrompt = PromptTemplate.fromTemplate(condenseQuestionTemplate);

    this.chain = ConversationalRetrievalQAChain.fromLLM(
      this.llm,
      vectorStore.asRetriever(4), // Get top 4 results
      {
        memory: this.memory,
        returnSourceDocuments: true,
        qaTemplate: qaPrompt,
        condenseQuestionPrompt: condenseQuestionPrompt,
        verbose: true,
      }
    );

    console.log("RAG chatbot initialized successfully");
  }

  // Send a message and get a response
  async sendMessage(message) {
    if (!this.chain) {
      throw new Error("Chatbot not initialized with knowledge base");
    }

    try {
      const response = await this.chain.call({
        question: message,
      });

      // Format the response to include sources if available
      let formattedResponse = response.text;
      
      if (response.sourceDocuments && response.sourceDocuments.length > 0) {
        // Optional: add source information to the response
        const sourceNames = new Set();
        response.sourceDocuments.forEach(doc => {
          if (doc.metadata && doc.metadata.source) {
            sourceNames.add(doc.metadata.source);
          }
        });
        
        if (sourceNames.size > 0) {
          formattedResponse += `\n\n(Information from: ${Array.from(sourceNames).join(", ")})`;
        }
      }

      return formattedResponse;
    } catch (error) {
      console.error("Error in chatbot:", error);
      return "Sorry, I encountered an error processing your request.";
    }
  }

  // Clear conversation history
  clearHistory() {
    this.memory.clear();
  }
}