<template>
  <div class="about container py-5">
    <h1 class="mb-4">About The Actual Informer</h1>
    
    <b-card class="mb-4">
      <h3>Project Description</h3>
      <p>
        The Actual Informer is a web application disguised as a news company that dynamically fetches real current news stories 
        from around the world and uses generative artificial intelligence (GAI) to amplify, distort, and exaggerate their content, 
        pushing the limits of what AI-generated communication and storytelling can look like.
      </p>
      <p>
        Our AI model autonomously transforms these stories into hyperbolic, surreal, or even absurd versions 
        mimicking the exaggeration found in political campaigns, news cycles, and media manipulation. 
        This project is a satirical exploration of how GAI and media sensationalism can work together 
        to create increasingly extreme narratives, and serves as commentary on the potential for AI 
        to be weaponized for misinformation in the future.
      </p>
    </b-card>
    
    <b-card class="mb-4">
      <h3>How It Works</h3>
      <p>The application works through several interconnected steps:</p>
      
      <ol>
        <li>
          <strong>Data Collection:</strong> Real-time news headlines and full-text articles are automatically 
          fetched using news APIs.
        </li>
        <li>
          <strong>Text Transformation:</strong> A text-to-text generative AI model (OpenAI's GPT-4o) rewrites the 
          fetched articles to introduce exaggerated narratives, surreal twists, and unpredictable creative elements.
        </li>
        <li>
          <strong>Image Generation:</strong> A text-to-image generative AI model (DALL-E 3) automatically produces 
          attention-grabbing, hyperbolic, and exaggerated thumbnails relevant to each article.
        </li>
        <li>
          <strong>Audio Synthesis:</strong> A text-to-audio generative AI model creates synthetic 
          audio news reports from the AI-generated article text.
        </li>
      </ol>
    </b-card>
    
    <b-card>
      <h3>Disclaimer</h3>
      <p>
        <strong>This is a satirical art project.</strong> The transformed articles on this site are not meant to be taken as factual news. 
        They are deliberately exaggerated and distorted using AI to highlight the potential risks of AI-generated misinformation.
      </p>
      <p>
        All original articles are sourced from legitimate news outlets, and links to the original sources are always provided.
        The transformations are created for educational and artistic purposes only.
      </p>
    </b-card>
    
    <div class="mt-4">
      <b-button to="/" variant="primary">Back to Home</b-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AboutPage'
}
</script>