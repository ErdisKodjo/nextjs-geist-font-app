import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    const { title, category, features } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({ message: 'Le titre du produit est requis' });
    }

    // Check if OpenRouter API key is available
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      // Fallback to mock description if no API key
      const mockDescription = generateMockDescription(title, category, features);
      return res.status(200).json({
        description: mockDescription,
        source: 'mock'
      });
    }

    // Prepare the prompt for AI
    const prompt = `Génère une description de produit professionnelle et attrayante pour un marketplace en ligne.

Produit: ${title}
Catégorie: ${category || 'Non spécifiée'}
Caractéristiques: ${features || 'Non spécifiées'}

La description doit:
- Être en français
- Faire entre 100-200 mots
- Mettre en avant les avantages et bénéfices
- Être persuasive pour inciter à l'achat
- Inclure des détails techniques pertinents
- Avoir un ton professionnel mais accessible

Génère uniquement la description, sans titre ni formatage supplémentaire.`;

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8000',
        'X-Title': 'Marketplace Demo'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en rédaction de descriptions de produits pour e-commerce. Tu écris des descriptions persuasives, informatives et optimisées pour la vente en ligne.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      console.error('OpenRouter API error:', response.status, response.statusText);
      // Fallback to mock description
      const mockDescription = generateMockDescription(title, category, features);
      return res.status(200).json({
        description: mockDescription,
        source: 'mock',
        note: 'API temporairement indisponible, description générée localement'
      });
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const generatedDescription = data.choices[0].message.content.trim();
      
      return res.status(200).json({
        description: generatedDescription,
        source: 'ai',
        model: 'anthropic/claude-sonnet-4'
      });
    } else {
      throw new Error('Format de réponse inattendu de l\'API');
    }

  } catch (error) {
    console.error('AI Description generation error:', error);
    
    // Fallback to mock description in case of any error
    const { title, category, features } = req.body;
    const mockDescription = generateMockDescription(title, category, features);
    
    return res.status(200).json({
      description: mockDescription,
      source: 'mock',
      note: 'Erreur lors de la génération IA, description générée localement'
    });
  }
}

function generateMockDescription(title: string, category?: string, features?: string): string {
  const templates = [
    `Découvrez ${title}, un produit d'exception qui allie qualité et performance. ${category ? `Spécialement conçu pour la catégorie ${category}, ` : ''}ce produit répond à tous vos besoins avec ses caractéristiques avancées. ${features ? `Avec ${features}, ` : ''}il offre une expérience utilisateur incomparable. Sa conception moderne et ses finitions soignées en font un choix idéal pour les utilisateurs exigeants. Profitez d'une qualité premium à un prix compétitif et transformez votre quotidien avec ce produit innovant.`,
    
    `${title} représente l'excellence dans sa catégorie. ${category ? `En tant que produit ${category}, ` : ''}il se distingue par sa qualité supérieure et ses performances exceptionnelles. ${features ? `Grâce à ${features}, ` : ''}vous bénéficiez d'une technologie de pointe qui simplifie votre vie. Son design élégant et sa robustesse en font un investissement durable. Choisissez la qualité, choisissez l'innovation, choisissez ${title} pour une expérience unique et satisfaisante.`,
    
    `Optez pour ${title}, la solution parfaite qui combine innovation et praticité. ${category ? `Dans l'univers ${category}, ` : ''}ce produit se démarque par ses fonctionnalités avancées et sa facilité d'utilisation. ${features ? `Avec ${features}, ` : ''}il répond aux attentes les plus élevées en matière de performance et de fiabilité. Son rapport qualité-prix exceptionnel et sa conception soignée en font un choix incontournable pour tous ceux qui recherchent l'excellence.`
  ];
  
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  return randomTemplate;
}
