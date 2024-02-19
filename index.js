import express from 'express';
import { getAgentChain } from './agent.js';
import dotenv from 'dotenv'
import * as XLSX from 'xlsx/xlsx.mjs';
import * as fs from 'fs';

XLSX.set_fs(fs);

const app = express();
const PORT = process.env.PORT || 3000;
dotenv.config();

// Middleware
app.use(express.json());

function writeToCSV(question, response, responseTime) {
    const data = `${question},${response},${responseTime}\n`;
    fs.appendFileSync('output.csv', data);
}

// Routes
app.post('/', async(req, res) => {
    const workbook = XLSX.readFile('factual questions.xlsx');
    const sheetName = workbook.SheetNames[0]; // Assuming the data is in the first sheet

    // Get worksheet
    const worksheet = workbook.Sheets[sheetName];

    // // Define the range of cells containing questions
    const questions = Object.keys(worksheet)
    .filter(cellAddress => cellAddress.startsWith('A'))
    .map(cellAddress => worksheet[cellAddress].v);
    
    for(const input of questions) {
        const executor = getAgentChain();
        const startTime = Date.now();
        const result = await executor.invoke({ input });
        const endTime = Date.now();
        const responseTime = (endTime - startTime) / 1000;
        writeToCSV(input, result['output'], responseTime);
    }   

    return res.json({result: result["output"]})
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});