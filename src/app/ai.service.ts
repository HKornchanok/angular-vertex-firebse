/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { Injectable, Inject, inject } from "@angular/core";
import { FirebaseApp } from "@angular/fire/app";
import {
  getVertexAI,
  getGenerativeModel,
  GenerativeModel,
  ChatSession,
  FunctionDeclarationsTool,
  ObjectSchemaInterface,
  Schema,
} from "@angular/fire/vertexai";
import { ProductService } from "./product.service";
import { Product } from "./product";

@Injectable({
  providedIn: "root",
})
export class AiService {
  private readonly model: GenerativeModel;
  private readonly products: ProductService = inject(ProductService);
  private readonly chat: ChatSession;

  constructor(@Inject("FIREBASE_APP") private firebaseApp: FirebaseApp) {
    const productsToolSet: FunctionDeclarationsTool = {
      functionDeclarations: [
        {
          name: "getNumberOfProducts",
          description:
            "Get a count of the number of products available in the inventory.",
        },
        {
          name: "getProducts",
          description:
            "Get an array of the products with the name and price of each product.",
        },
        {
          name: "addToCart",
          description: "Add one or more products to the cart.",
          parameters: Schema.object({
            properties: {
              productsToAdd: Schema.array({
                items: Schema.object({
                  description: "A single product with its name and price.",
                  properties: {
                    name: Schema.string({
                      description: "The name of the product.",
                    }),
                    price: Schema.number({
                      description: "The numerical price of the product.",
                    }),
                  },
                  // Specify which properties within each product object are required
                  required: ["name", "price"],
                }),
              }),
            },
          }) as ObjectSchemaInterface,
        },
        {
          name: "removeFromCart",
          description: "Remove one or more products from the cart.",
          parameters: Schema.object({
            properties: {
              productsToRemove: Schema.array({
                items: Schema.object({
                  description: "A single product with its name and price.",
                  properties: {
                    name: Schema.string({
                      description: "The name of the product.",
                    }),
                    price: Schema.number({
                      description: "The numerical price of the product.",
                    }),
                  },
                  required: ["name", "price"],
                }),
              }),
            },
          }) as ObjectSchemaInterface,
        },
      ],
    };

    // Initialize the Vertex AI service
    const vertexAI = getVertexAI(this.firebaseApp);
    
    // Get all products to include in system instruction
    const allProducts = this.products.getProducts();
    const productList = allProducts.map(p => `${p.name} ($${p.price.toFixed(2)})`).join('\n');
    
    const systemInstruction = `Welcome to ng-produce. You are a superstar agent for this ecommerce store. You will assist users by answering questions about the inventory and even being able to add or remove items from the cart.

Here are all the available products and their prices:
${productList}

You can help users by:
1. Answering questions about product availability and prices
2. Adding products to their cart
3. Removing products from their cart
4. Providing information about the total cart value
5. Suggesting products based on user preferences

Please be helpful and friendly in your responses.`;

    // Initialize the generative model with a model that supports your use case
    this.model = getGenerativeModel(vertexAI, {
      model: "gemini-2.0-flash",
      systemInstruction: systemInstruction,
      tools: [productsToolSet],
    });

    this.chat = this.model.startChat();
  }

  async ask(prompt: string) {
    let result = await this.chat.sendMessage(prompt);
    const functionCalls = result.response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      for (const functionCall of functionCalls) {
        switch (functionCall.name) {
          case "getNumberOfProducts": {
            const functionResult = this.getNumberOfProducts();
            result = await this.chat.sendMessage([
              {
                functionResponse: {
                  name: functionCall.name,
                  response: { numberOfItems: functionResult },
                },
              },
            ]);
            break;
          }
          case "getProducts": {
            const functionResult = this.getProducts();
            result = await this.chat.sendMessage([
              {
                functionResponse: {
                  name: functionCall.name,
                  response: { products: functionResult },
                },
              },
            ]);
            break;
          }
          case "addToCart": {
            console.log(functionCall.args);

            const args = functionCall.args as { productsToAdd: Product[]}

            const functionResult = this.addToCart(args.productsToAdd);

            result = await this.chat.sendMessage([
              {
                functionResponse: {
                  name: functionCall.name,
                  response: { numberOfProductsAdded: functionResult },
                },
              }
            ]);
            break;
          }
          case "removeFromCart": {
            console.log(functionCall.args);

            const args = functionCall.args as { productsToRemove: Product[]}

            const functionResult = this.removeFromCart(args.productsToRemove);

            result = await this.chat.sendMessage([
              {
                functionResponse: {
                  name: functionCall.name,
                  response: { numberOfProductsRemoved: functionResult },
                },
              }
            ]);
            break;
          }
        }
      }
    }

    return result.response.text();
  }

  getProducts() {
    return this.products.getProducts();
  }
  getNumberOfProducts() {
    return this.getProducts().length;
  }

  addToCart(productsToAdd: Product[]) {
    for (let i = 0; i < productsToAdd.length; i++) {
      this.products.addToCart(productsToAdd[i]);
    }
  }

  removeFromCart(productsToRemove: Product[]) {
    for (let i = 0; i < productsToRemove.length; i++) {
      this.products.removeFromCart(productsToRemove[i]);
    }
  }
}
