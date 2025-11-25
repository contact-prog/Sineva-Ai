import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import * as XLSX from "npm:xlsx@0.18.5";
import { generateVertexAuthToken, getVertexProjectId } from "../_shared/vertex-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParseEmailListRequest {
  fileContent: string;
  fileName: string;
}

interface EmailContact {
  name?: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, fileName }: ParseEmailListRequest = await req.json();

    if (!fileContent) {
      return new Response(
        JSON.stringify({ error: "File content is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isExcelFile = fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');
    let contacts: EmailContact[] = [];

    if (isExcelFile) {
      console.log("Processing Excel file with Vertex AI parsing...");
      
      try {
        // Extract base64 content
        const base64Content = fileContent.includes('base64,') 
          ? fileContent.split('base64,')[1] 
          : fileContent;

        // Convert base64 to buffer and parse Excel
        const buffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        console.log(`Extracted ${jsonData.length} rows from Excel`);

        // Use Vertex AI for intelligent parsing
        const projectId = getVertexProjectId();
        const token = await generateVertexAuthToken();
        
        const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`;

        const prompt = `You are an expert data parser. Analyze this spreadsheet data and extract email contacts.

RULES:
1. Detect which column contains emails (look for patterns like @, .com, etc.)
2. Detect which column contains names if available
3. Column names can be ANYTHING (email, mail, contact, e-mail, etc.)
4. If no headers exist, use pattern recognition
5. Clean and validate all emails
6. Remove rows with invalid/missing emails
7. Handle any file layout or column order

DATA:
${JSON.stringify(jsonData.slice(0, 100))}

RESPOND WITH ONLY VALID JSON (no markdown, no explanation):
[
  { "name": "John Doe", "email": "john@example.com" },
  { "name": "Jane Smith", "email": "jane@example.com" }
]

If no name column exists, omit the name field. Return empty array [] if no emails found.`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048
            }
          })
        });

        if (!response.ok) {
          throw new Error(`Vertex AI parsing failed: ${response.status}`);
        }

        const data = await response.json();
        let extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        
        // Clean markdown formatting if present
        extractedText = extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        console.log("Vertex AI response:", extractedText);

        // Parse the JSON response
        const parsedContacts = JSON.parse(extractedText);
        
        if (Array.isArray(parsedContacts)) {
          // Validate emails
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          contacts = parsedContacts
            .filter((c: any) => c.email && emailRegex.test(c.email))
            .map((c: any) => ({
              name: c.name || undefined,
              email: c.email.toLowerCase().trim()
            }));
        }

        console.log(`Successfully parsed ${contacts.length} contacts using Vertex AI`);

      } catch (error) {
        console.error("Vertex AI parsing error:", error);
        return new Response(
          JSON.stringify({ 
            error: "Unable to detect email column. Please check your file format and ensure it contains valid email addresses." 
          }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } else {
      // CSV/Text file - simple regex extraction
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const foundEmails = fileContent.match(emailRegex) || [];
      const uniqueEmails = [...new Set(foundEmails)];
      const emailValidationRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      contacts = uniqueEmails
        .filter(email => emailValidationRegex.test(email))
        .map(email => ({ email: email.toLowerCase().trim() }));
    }

    if (contacts.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No valid email addresses found. Please ensure your file contains email addresses." 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        contacts: contacts,
        count: contacts.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error parsing email list:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to parse email list" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
