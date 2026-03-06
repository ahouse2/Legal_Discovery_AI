import express from 'express';
import { driveClient } from '../services/drive.js';
import { geminiModel } from '../services/gemini.js';

const router = express.Router();

// POST /api/files/index
// Returns a list of files from Drive (mocked if no credentials)
// Client is responsible for saving these to Firestore
router.post('/index', async (req, res) => {
  try {
    // In a real app, we'd list files from the connected Drive folder.
    // For this prototype, we'll simulate finding some files.
    
    const mockFiles = [
      { name: 'Court Filing - Complaint.pdf', mimeType: 'application/pdf', webViewLink: '#', thumbnailLink: '' },
      { name: 'Email Evidence - 2023-05-12.eml', mimeType: 'message/rfc822', webViewLink: '#', thumbnailLink: '' },
      { name: 'Photo of Scene.jpg', mimeType: 'image/jpeg', webViewLink: '#', thumbnailLink: '' },
      { name: 'Witness Statement.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', webViewLink: '#', thumbnailLink: '' },
      { name: 'Police Report.pdf', mimeType: 'application/pdf', webViewLink: '#', thumbnailLink: '' }
    ];
    
    res.json({ files: mockFiles });
  } catch (error) {
    console.error('Error indexing files:', error);
    res.status(500).json({ error: 'Failed to index files' });
  }
});

// POST /api/files/process
// Accepts file metadata, analyzes with Gemini, and returns analysis
// Client is responsible for saving analysis to Firestore
router.post('/process', async (req, res) => {
  const { fileId, name, mimeType } = req.body;
  
  if (!name || !mimeType) {
    return res.status(400).json({ error: 'Missing file name or mimeType' });
  }
  
  try {
    // Simulate processing with Gemini
    // In a real app, we would download the file content and send it to Gemini.
    // Here we use Gemini to hallucinate plausible legal data based on the filename for demonstration.
    
    const prompt = `
      Analyze the following legal document filename and generate a JSON response with:
      1. A brief summary of what this document likely contains.
      2. A list of 3-5 plausible entities (people, organizations, locations) that might appear in it.
      3. A list of 1-2 plausible timeline events (date in YYYY-MM-DD format, description) associated with it.
      4. A list of 2-3 legal topics or principles relevant to this document (e.g., "Attorney Misconduct", "Hearsay").
      
      Filename: "${name}"
      MimeType: "${mimeType}"
      
      Response format:
      {
        "summary": "string",
        "entities": [{"name": "string", "type": "PERSON|ORGANIZATION|LOCATION"}],
        "events": [{"date": "YYYY-MM-DD", "description": "string"}],
        "topics": ["string"]
      }
    `;

    const result = await geminiModel.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const responseText = result.text;
    const analysis = JSON.parse(responseText || '{}');

    // Generate embeddings for the summary (simulated or using a real embedding model if available)
    // We'll use the text-embedding-004 model if possible, otherwise mock it.
    let embedding: number[] = [];
    try {
      const embeddingResult = await geminiModel.embedContent({
        model: 'text-embedding-004',
        contents: { parts: [{ text: analysis.summary || name }] }
      });
      embedding = embeddingResult.embeddings?.[0]?.values || [];
    } catch (e) {
      console.warn('Embedding generation failed, using mock:', e);
      embedding = new Array(768).fill(0).map(() => Math.random());
    }

    const summary = analysis.summary || `Analyzed content of ${name}.`;
    const entities = analysis.entities || [];
    const events = analysis.events || [];
    const topics = analysis.topics || [];

    // Prepare Cypher statements for Neo4j export
    // This allows the user to import this data into a local Neo4j instance later
    const cypherStatements = [];
    
    // Create Document Node
    cypherStatements.push(`MERGE (d:Document {id: "${fileId}"}) SET d.name = "${name}", d.summary = "${summary.replace(/"/g, '\\"')}"`);
    
    // Create Entity Nodes and Relationships
    entities.forEach((e: any) => {
      const label = e.type === 'PERSON' ? 'Person' : e.type === 'ORGANIZATION' ? 'Organization' : 'Location';
      cypherStatements.push(`MERGE (e:${label} {name: "${e.name}"})`);
      cypherStatements.push(`MERGE (d:Document {id: "${fileId}"})-[:MENTIONS]->(e:${label} {name: "${e.name}"})`);
    });

    // Create Topic Nodes
    topics.forEach((t: string) => {
      cypherStatements.push(`MERGE (t:Topic {name: "${t}"})`);
      cypherStatements.push(`MERGE (d:Document {id: "${fileId}"})-[:RELATES_TO]->(t:Topic {name: "${t}"})`);
    });

    res.json({ success: true, summary, entities, events, topics, embedding, cypherStatements });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

export default router;
