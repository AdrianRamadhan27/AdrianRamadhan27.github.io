const projectsData = [
    {
        id: 8,
        title: "Portfolio",
        dateStart: "2024-08-01",
        dateEnd: "",
        techStacks: ["React.js", "Tailwind CSS", "LLaMa", "Github-pages"],
        description:
          "The website you're currently on. At the beginning, this was only an assignment from Digistar Class, but then I got to develop it even further for my own benefit. Uses groqcloud's LLaMa model for the chat feature. Built using React.js and Deployed on GitHub Pages.",
        links: [
          { name: "View the Repository", url: "https://github.com/AdrianRamadhan27/AdrianRamadhan27.github.io" }, 
        ],
        imageFile: "portfolio.png", 
        type: "Individual",
      },
    {
        id: 7,
        title: "OCA Interaction Custom Dashboard",
        dateStart: "2024-08-01",
        dateEnd: "",
        techStacks: ["React.js", "Tailwind CSS", "Vercel"],
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
        id: 6,
        title: "BRIBRAIN Letter Generator",
        dateStart: "2024-03-01",
        dateEnd: "2024-07-01",
        techStacks: ["OpenAI", "LLaMa", "Mistral", "Gradio", "Unsloth"],
        description:
            "As a capstone research project at BRIBRAIN Academy, I was tasked to improve the existing LLM-powered Letter Generator at BRI. I fine-tuned open-source models LL M-7B andMMistral-7B) Gsing LoRA oU a dataset synthesized from actual letter generator inputs and outputs.",
        links: [
            { name: "HuggingFace Space", url: "https://huggingface.co/spaces/raden-mohamad11/letter_generator_bribrain" }, 
        ],
        imageFile: "lettergenerator.png", 
        type: "Individual",
    },
    {
        id: 5,
        title: "Talacare A1",
        dateStart: "2024-02-01",
        dateEnd: "2024-06-01",
        techStacks: [
            "Flutter",
            "Flame",
            "django",
            "Postgres",
            "Supabase",
            "GCP",
            "Sonarqube",
        ],
        description:
            "As part of a Software Engineering Project Course at UI, I collaborated with 6 other students to develop a mobile game for preschool children with Thalassemia. The app features a 2D adventure game and minigames, along with features like a medicine reminder and player data export via email.",
        links: [
            { name: "GitHub Organization", url: "https://github.com/PPL-A1-Genap-2023-2024" }, 
            { name: "Download the Game", url: "https://a1-talacare.itch.io/talacare" }, 
        ],
        imageFile: "talacarea1.jpg", 
        type: "Group",
    },
    {
        id: 4,
        title: "Apartment Listings Model",
        dateStart: "2023-09-01",
        dateEnd: "2023-12-01",
        techStacks: ["scikit-learn", "pandas", "matplotlib"],
        description:
            "For the 'Artificial Intelligence & Basic Data Science' course final project, I worked on a dataset of apartment listings. The tasks included EDA, building age classification, apartment price prediction, and clustering using Scikit-Learn's RandomForest, KNN, and LogisticRegression.",
        links: [
            { name: "View the Notebook", url: "https://colab.research.google.com/drive/1tw1Ow1EOf1IHTQsypqGOFenqpt4sNSgl?usp=sharing" }, 
            { name: "Report Deck", url: "https://www.canva.com/design/DAFzd0MrkmU/kEzTVrIV_fN344xq1QaV2Q/view?utm_content=DAFzd0MrkmU&utm_campaign=designshare&utm_medium=link&utm_source=editor" }, 
        ],
        imageFile: "apartment.png", 
        type: "Individual",
    },
    {
        id: 3,
        title: "Tracko",
        dateStart: "2023-03-01",
        dateEnd: "2023-06-01",
        techStacks: ["SpringBoot", "Vue.js", "Postgres", "Supabase", "Tailwind CSS", "GCP", "Vercel", "Sonarqube"],
        description:
            "For the 'Advanced Programming' course final project, I collaborated with 4 other students to develop a movie tracking website with features like movie reviews, progress tracking, and database moderation. I worked on the backend services, which used a microservices architecture and were deployed on GCP.",
        links: [
            { name: "Documentation", url: "https://www.canva.com/design/DAFlCq-3y2w/aVDB6wNXesMqdtN3bRH40g/view?utm_content=DAFlCq-3y2w&utm_campaign=designshare&utm_medium=link&utm_source=editor" }, 
            { name: "Visit the site (Backend is Down)", url: "https://adpro-b11.vercel.app/" }, 
        ],
        imageFile: "tracko.png", 
        type: "Group",
    },
    {
        id: 2,
        title: "Mercatura",
        dateStart: "2022-09-01",
        dateEnd: "2022-12-01",
        techStacks: ["django", "jQuery", "Flutter", "Postgres", "Tailwind CSS", "Railway",],
        description:
            "As part of the 'Platform-Based Programming' course project, my team developed 'Mercatura', a platform for UMKM (micro-businesses). I worked on the UMKM data page, and we built the platform using Django with Tailwind CSS for styling and a mobile app with Flutter, using the Django-Rest API.",
        links: [
            { name: "Documentation", url: "https://www.canva.com/design/DAFUoB4A0TQ/aK6rI-LvT7oYvrAB7ysy9Q/view?utm_content=DAFUoB4A0TQ&utm_campaign=designshare&utm_medium=link&utm_source=editor" }, 
            { name: "Web Repository", url: "https://github.com/AdrianRamadhan27/mercatura" }, 
            { name: "Mobile App Repository", url: "https://github.com/AdrianRamadhan27/mercatura_mobile" }, 
        ],
        imageFile: "mercatura.jpg", 
        type: "Group",
    },
    {
        id: 1,
        title: "Anime Recommendation System",
        dateStart: "2022-07-01",
        dateEnd: "2022-07-01",
        techStacks: ["scikit-learn", "keras"],
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
  