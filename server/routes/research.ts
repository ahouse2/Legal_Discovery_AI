import express from 'express';
import * as cheerio from 'cheerio';
import { geminiModel } from '../services/gemini.js';
import { runQuery } from '../services/neo4j.js';

const router = express.Router();

// Helper to calculate relevance score (mock implementation)
const calculateRelevance = (text: string, query: string): number => {
  const queryTerms = query.toLowerCase().split(' ');
  const textLower = text.toLowerCase();
  let matches = 0;
  queryTerms.forEach(term => {
    if (textLower.includes(term)) matches++;
  });
  return Math.min(Math.round((matches / queryTerms.length) * 100), 100);
};

// Real CourtListener API implementation
const searchCourtListener = async (query: string) => {
  const apiKey = process.env.COURT_LISTENER_API_KEY;
  
  if (!apiKey) {
    console.warn('COURT_LISTENER_API_KEY is not set. Returning empty results for CourtListener.');
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      type: 'o', // Opinions
      order_by: 'score desc',
      stat_Precedential: 'on',
      jurisdiction: 'cal', // California jurisdictions
    });

    const response = await fetch(`https://www.courtlistener.com/api/rest/v3/search/?${params}`, {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`CourtListener API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    
    return (data.results || []).map((item: any) => ({
      id: `cl-${item.id}`,
      caseName: item.caseName || item.caseNameShort || 'Unknown Case',
      citation: item.citation ? item.citation.join(', ') : 'No citation',
      court: item.court || 'Unknown Court',
      dateFiled: item.dateFiled || 'Unknown Date',
      summary: item.snippet || item.caseName || 'No summary available',
      source: 'CourtListener',
      relevance: calculateRelevance(item.snippet || '', query), // Use local relevance or API score if available
      webViewLink: `https://www.courtlistener.com${item.absolute_url}`,
    }));
  } catch (error) {
    console.error('Error fetching from CourtListener:', error);
    return [];
  }
};

// Scraper for Leginfo (California Legislature)
const scrapeLeginfoCode = async (code: string) => {
  console.log(`Scraping Leginfo for code: ${code}`);
  try {
    // Fetch TOC for the code
    const url = `https://leginfo.legislature.ca.gov/faces/codes_displayTOC.xhtml?lawCode=${code}`;
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract sections from TOC (simplified for demo)
    // In a real implementation, we would traverse the TOC structure deeply
    const sections: any[] = [];
    $('a[href*="displaySection"]').each((i, el) => {
      if (i < 5) { // Limit to 5 sections for demo performance
        const href = $(el).attr('href');
        const sectionNum = $(el).text().trim();
        if (href) {
          sections.push({
            code,
            sectionNum,
            url: `https://leginfo.legislature.ca.gov${href}`
          });
        }
      }
    });

    // Fetch content for each section
    const scrapedData = [];
    for (const section of sections) {
      try {
        const secRes = await fetch(section.url);
        const secHtml = await secRes.text();
        const $sec = cheerio.load(secHtml);
        const text = $sec('#content_box').text().trim(); // Adjust selector based on actual site structure
        
        scrapedData.push({
          ...section,
          text: text.substring(0, 500) + '...' // Truncate for storage demo
        });

        // Upload to Neo4j
        await runQuery(
          `
          MERGE (c:Code {name: $code})
          MERGE (s:Statute {id: $id})
          SET s.section = $section, s.text = $text, s.url = $url
          MERGE (c)-[:CONTAINS]->(s)
          `,
          {
            code: section.code,
            id: `${section.code}-${section.sectionNum}`,
            section: section.sectionNum,
            text: text,
            url: section.url
          }
        );
      } catch (err) {
        console.error(`Failed to scrape section ${section.sectionNum}`, err);
      }
    }
    
    return scrapedData;
  } catch (error) {
    console.error(`Error scraping Leginfo code ${code}:`, error);
    return [];
  }
};

const searchLeginfo = async (query: string) => {
  // Real scraping is hard without a headless browser for Leginfo's dynamic search.
  // We will simulate this for the prototype to ensure reliability.
  
  const prompt = `
    Generate 2 realistic California statutes or codes relevant to the search query: "${query}".
    Format as JSON array with fields: caseName (e.g., "Fam. Code § 3044"), citation (same as name), court (e.g., "California Legislature"), dateFiled (e.g., "2023-01-01"), summary.
  `;
  
  try {
    const result = await geminiModel.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    
    const data = JSON.parse(result.text || '[]');
    return data.map((item: any, index: number) => ({
      id: `li-${Date.now()}-${index}`,
      source: 'Leginfo',
      relevance: calculateRelevance(item.summary + item.caseName, query),
      ...item
    }));
  } catch (error) {
    console.error('Error generating mock Leginfo data:', error);
    return [];
  }
};

router.post('/search', async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const [courtListenerResults, leginfoResults] = await Promise.all([
      searchCourtListener(query),
      searchLeginfo(query)
    ]);

    const allResults = [...courtListenerResults, ...leginfoResults].sort((a, b) => b.relevance - a.relevance);
    
    res.json({ results: allResults });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to perform legal research' });
  }
});

router.post('/scrape-leginfo', async (req, res) => {
  const { codes } = req.body; // e.g., ['FAM', 'CIV']
  
  if (!codes || !Array.isArray(codes)) {
    return res.status(400).json({ error: 'Codes array is required' });
  }

  try {
    const results = [];
    for (const code of codes) {
      const data = await scrapeLeginfoCode(code);
      results.push(...data);
    }
    res.json({ message: 'Scraping completed', count: results.length, data: results });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: 'Failed to scrape Leginfo' });
  }
});

export default router;
