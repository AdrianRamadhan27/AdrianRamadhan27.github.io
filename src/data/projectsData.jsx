const projectsData = [
    {
      title: "OCA Interaction Custom Dashboard",
      dateStart: "2024-08-01",
      dateEnd: "",
      techStacks: ["react", "tailwind"],
      description:
        "As part of a capstone project at Digistar Class, I worked inside a team of 5, with myself being the sole Front-End Developer. We were tasked to develop a use case based on Telkom's digital product OCA (Omni Communication Assistant). Our use case is a custom dashboard for OCA's ticketing service. I developed the Front-End of the website using React.js, Tailwind CSS, and Vite.",
      links: [
        { name: "View the Repository", url: "https://github.com/AdrianRamadhan27/digistar-27" }, 
        { name: "Visit the site", url: "https://digistar-27.vercel.app/analytics/" }, 
      ],
      imageFile: "oca.png", 
      type: "Group",
    },
    {
      title: "BRIBRAIN Letter Generator",
      dateStart: "2024-03-01",
      dateEnd: "2024-07-01",
      techStacks: ["openai", "llama", "mistral"],
      description:
        "As a capstone research project at BRIBRAIN Academy, I was tasked to improve the existing LLM-powered Letter Generator at BRI. I fine-tuned open-source models (LLaMa 2-7B and Mistral-7B) using LoRA on a dataset synthesized from actual letter generator inputs and outputs.",
      links: [
        { name: "HuggingFace Space", url: "https://huggingface.co/spaces/raden-mohamad11/letter_generator_bribrain" }, 
      ],
      imageFile: "lettergenerator.png", 
      type: "Individual",
    },
    {
      title: "Talacare A1",
      dateStart: "2024-02-01",
      dateEnd: "2024-06-01",
      techStacks: [
        "flutter",
        "flame",
        "django",
      ],
      description:
        "As part of a Software Engineering Project Course at UI, I collaborated with 6 other students to develop a mobile game for preschool children with Thalassemia. The app features a 2D adventure game and minigames, along with features like a medicine reminder and player data export via email.",
      links: [
        { name: "GitHub Organization", url: "https://github.com/PPL-A1-Genap-2023-2024" }, 
        { name: "Download the Game", url: "https://a1-talacare.itch.io/talacare" }, 
      ],
      imageFile: "talacare.png", 
      type: "Group",
    },
    {
      title: "Apartment Listings Model",
      dateStart: "2023-09-01",
      dateEnd: "2023-12-01",
      techStacks: ["sklearn", "pandas"],
      description:
        "For the 'Artificial Intelligence & Basic Data Science' course final project, I worked on a dataset of apartment listings. The tasks included EDA, building age classification, apartment price prediction, and clustering using Scikit-Learn's RandomForest, KNN, and LogisticRegression.",
      links: [
        { name: "View the Notebook", url: "https://colab.research.google.com/drive/1tw1Ow1EOf1IHTQsypqGOFenqpt4sNSgl?usp=sharing" }, 
        { name: "Report Deck", url: "https://tracko.my.canva.site/apartment-listings" }, 
      ],
      imageFile: "apartment.png", 
      type: "Individual",
    },
    {
      title: "Tracko",
      dateStart: "2023-03-01",
      dateEnd: "2023-06-01",
      techStacks: ["springboot", "vue", "gcp"],
      description:
        "For the 'Advanced Programming' course final project, I collaborated with 4 other students to develop a movie tracking website with features like movie reviews, progress tracking, and database moderation. I worked on the backend services, which used a microservices architecture and were deployed on GCP.",
      links: [
        { name: "Documentation", url: "https://tracko.my.canva.site/" }, 
        { name: "Visit the site (Backend is Down)", url: "https://adpro-b11.vercel.app/" }, 
      ],
      imageFile: "tracko.png", 
      type: "Group",
    },
    {
      title: "Mercatura",
      dateStart: "2022-09-01",
      dateEnd: "2022-12-01",
      techStacks: ["django", "flutter", "tailwind"],
      description:
        "As part of the 'Platform-Based Programming' course project, my team developed 'Mercatura', a platform for UMKM (micro-businesses). I worked on the UMKM data page, and we built the platform using Django with Tailwind CSS for styling and a mobile app with Flutter, using the Django-Rest API.",
      links: [
        { name: "Web Repository", url: "https://github.com/AdrianRamadhan27/mercatura" }, 
        { name: "Mobile App Repository", url: "https://github.com/AdrianRamadhan27/mercatura_mobile" }, 
      ],
      imageFile: "mercatura.jpg", 
      type: "Group",
    },
    {
      title: "Anime Recommendation System",
      dateStart: "2022-07-01",
      dateEnd: "2022-07-01",
      techStacks: ["sklearn", "keras"],
      description:
        "For Dicoding's 'Applied Machine Learning' course final project, I developed an Anime Recommendation System using content-based filtering and collaborative filtering techniques. The system uses cosine similarity (TF-IDF) for genres and a collaborative filtering model based on user ratings.",
      links: [
        { name: "View the Notebook", url: "https://github.com/AdrianRamadhan27/anime_recommendation" }, 
      ],
      imageFile: "anime.png", 
      type: "Individual",
    },
  ];
  
  export default projectsData;
  