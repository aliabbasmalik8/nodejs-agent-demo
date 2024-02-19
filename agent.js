import { ChatOpenAI } from "@langchain/openai";
import { DynamicTool } from "@langchain/core/tools";
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from "@langchain/core/prompts";
import { convertToOpenAIFunction } from "@langchain/core/utils/function_calling";
import { RunnableSequence } from "@langchain/core/runnables";
import { AgentExecutor} from "langchain/agents";

import { formatToOpenAIFunctionMessages } from "langchain/agents/format_scratchpad";
import { OpenAIFunctionsAgentOutputParser } from "langchain/agents/openai/output_parser";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

/**
 * Define your chat model to use.
 */
export const getAgentChain = () => {
    const searchTool = new TavilySearchResults({
        apiKey: process.env.TAVILY_API_KEY,
        k: 3
    });
    const model = new ChatOpenAI({
        modelName: "gpt-3.5-turbo",
        temperature: 0,
        openAIApiKey: process.env.OPENAI_API_KEY
    });

    const customTool = new DynamicTool({
        name: "get_word_length",
        description: "Returns the length of a word.",
        func: async (input) => input.length.toString(),
    });

    /** Define your list of tools. */
    const tools = [customTool, searchTool];

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", "You are very powerful assistant, but don't know current events"],
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad"),
    ]);

    const modelWithFunctions = model.bind({
        functions: tools.map((tool) => convertToOpenAIFunction(tool)),
    });


    const runnableAgent = RunnableSequence.from([
        {
            input: (i) => i.input,
            agent_scratchpad: (i) =>
            formatToOpenAIFunctionMessages(i.steps),
        },
        prompt,
        modelWithFunctions,
        new OpenAIFunctionsAgentOutputParser(),
    ]);

    const executor = AgentExecutor.fromAgentAndTools({
        agent: runnableAgent,
        tools,
        //verbose: true
    });

    return executor
}