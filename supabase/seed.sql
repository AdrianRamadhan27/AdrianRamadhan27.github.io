-- Real content recovered from the old adrianramadhan27.github.io site.
-- Run once in the Supabase SQL Editor, AFTER schema.sql.
--
-- This covers all text content. Photos, the CV, and project screenshots
-- are NOT set here (image_path / photo_path / cv_path are left null) --
-- see scripts/seed-assets.mjs in this repo to upload the recovered old
-- screenshots + profile photo, or upload them yourself via the CMS.

-- ---------------------------------------------------------------- profile
update profile set
  full_name = 'Adrian Ramadhan',
  headline = 'AI Engineer, Data Scientist & Full-Stack Developer',
  hero_lines = array[
    'I build AI-driven products, full-stack',
    'web apps and 3D interactive experiences'
  ],
  about_text = 'I am a Computer Science student at the University of Indonesia (Fast Track Bachelor''s + Master''s) with a deep passion for Artificial Intelligence and Data Science. I also have strong skills in front-end and back-end development, mobile development, and have dabbled in cybersecurity.',
  email = 'ramadhanadrian2710@gmail.com',
  updated_at = now()
where id = 1;

-- ------------------------------------------------------------- experiences
-- Dates for the Teaching Assistant and Bangkit Academy roles were never
-- recorded on the old site (only "currently a..." in an internal prompt) --
-- edit date_label for those two once you have exact start/end dates.
delete from experiences;

insert into experiences (title, company_name, icon_bg, date_label, points, sort_order) values
(
  'Teaching Assistant, Data Science Course',
  'University of Indonesia',
  '#0d1f19',
  'Edit dates in CMS',
  array[
    'Assisted in teaching a Data Science course at the Faculty of Computer Science, UI.',
    'Helped students with coursework, grading, and lab sessions.'
  ],
  0
),
(
  'Machine Learning Cohort',
  'Bangkit Academy (by Google, GoTo, Traveloka)',
  '#0d1f19',
  'Edit dates in CMS',
  array[
    'Completed Bangkit Academy''s Machine Learning learning path.',
    'Built machine learning projects as part of the cohort curriculum.'
  ],
  1
),
(
  'AI Researcher Intern',
  'BRI (BRIBRAIN Academy)',
  '#0d1f19',
  'Mar 2024 - Jul 2024',
  array[
    'Capstone research project improving BRI''s existing LLM-powered Letter Generator.',
    'Fine-tuned open-source LLaMA-7B and Mistral-7B models using LoRA.',
    'Built the fine-tuning dataset by synthesizing it from actual letter generator inputs and outputs.'
  ],
  2
);

-- ---------------------------------------------------------------- projects
delete from projects;

insert into projects (name, description, tags, source_code_link, live_link, sort_order) values
(
  'SuaraHati',
  'As the capstone project of IBM''s Code Generation Course, I built a therapy journal website that lets users write journals and get AI analysis. Uses a GroqCloud model for the analysis and chat feature. Deployed on Vercel.',
  '[{"name":"Next.js","color":"blue-text-gradient"},{"name":"Tailwind CSS","color":"green-text-gradient"},{"name":"Groq","color":"pink-text-gradient"},{"name":"Vercel","color":"orange-text-gradient"},{"name":"Supabase","color":"blue-text-gradient"}]'::jsonb,
  'https://github.com/AdrianRamadhan27/ibm-project',
  'https://suarahati.vercel.app/',
  0
),
(
  'Portfolio (previous version)',
  'The previous version of this portfolio site. It started as an assignment from a Digistar class, then I developed it further for my own benefit -- using GroqCloud''s LLaMa model for a chat feature. Built with React.js and deployed on GitHub Pages.',
  '[{"name":"React.js","color":"blue-text-gradient"},{"name":"Tailwind CSS","color":"green-text-gradient"},{"name":"LLaMa","color":"pink-text-gradient"},{"name":"Github Pages","color":"orange-text-gradient"}]'::jsonb,
  'https://github.com/AdrianRamadhan27/AdrianRamadhan27.github.io',
  null,
  1
),
(
  'OCA Interaction Custom Dashboard',
  'As part of a capstone project at Digistar Class, I worked in a team of 5 as the sole Front-End Developer. We built a use case for Telkom''s OCA (Omni Communication Assistant): a custom dashboard for OCA''s ticketing service. I developed the front-end using React.js, Tailwind CSS, and Vite.',
  '[{"name":"React.js","color":"blue-text-gradient"},{"name":"Tailwind CSS","color":"green-text-gradient"},{"name":"Vercel","color":"pink-text-gradient"}]'::jsonb,
  'https://github.com/AdrianRamadhan27/digistar-27',
  'https://digistar-27.vercel.app/analytics/',
  2
),
(
  'BRIBRAIN Letter Generator',
  'As a capstone research project at BRIBRAIN Academy, I improved BRI''s existing LLM-powered Letter Generator. I fine-tuned open-source models LLaMa-7B and Mistral-7B using LoRA on a dataset synthesized from actual letter generator inputs and outputs.',
  '[{"name":"GPT","color":"blue-text-gradient"},{"name":"LLaMa","color":"green-text-gradient"},{"name":"Mistral","color":"pink-text-gradient"},{"name":"Gradio","color":"orange-text-gradient"},{"name":"Unsloth","color":"blue-text-gradient"}]'::jsonb,
  'https://huggingface.co/spaces/raden-mohamad11/letter_generator_bribrain',
  null,
  3
),
(
  'Talacare A1',
  'As part of a Software Engineering Project course at UI, I collaborated with 6 other students to build a mobile game for preschool children with Thalassemia. The app features a 2D adventure game and minigames, plus a medicine reminder and player data export via email.',
  '[{"name":"Flutter","color":"blue-text-gradient"},{"name":"Flame","color":"green-text-gradient"},{"name":"django","color":"pink-text-gradient"},{"name":"Postgres","color":"orange-text-gradient"},{"name":"Supabase","color":"blue-text-gradient"},{"name":"GCP","color":"green-text-gradient"},{"name":"Sonarqube","color":"pink-text-gradient"}]'::jsonb,
  'https://github.com/PPL-A1-Genap-2023-2024',
  'https://a1-talacare.itch.io/talacare',
  4
),
(
  'Apartment Listings Model',
  'For the "Artificial Intelligence & Basic Data Science" course final project, I worked on a dataset of apartment listings: EDA, building-age classification, apartment price prediction, and clustering using scikit-learn''s RandomForest, KNN, and LogisticRegression.',
  '[{"name":"scikit-learn","color":"blue-text-gradient"},{"name":"pandas","color":"green-text-gradient"},{"name":"matplotlib","color":"pink-text-gradient"}]'::jsonb,
  'https://colab.research.google.com/drive/1tw1Ow1EOf1IHTQsypqGOFenqpt4sNSgl?usp=sharing',
  null,
  5
),
(
  'Tracko',
  'For the "Advanced Programming" course final project, I collaborated with 4 other students on a movie tracking website (reviews, progress tracking, database moderation). I worked on the backend services, using a microservices architecture deployed on GCP.',
  '[{"name":"SpringBoot","color":"blue-text-gradient"},{"name":"Vue.js","color":"green-text-gradient"},{"name":"Postgres","color":"pink-text-gradient"},{"name":"Supabase","color":"orange-text-gradient"},{"name":"Tailwind CSS","color":"blue-text-gradient"},{"name":"GCP","color":"green-text-gradient"},{"name":"Vercel","color":"pink-text-gradient"},{"name":"Sonarqube","color":"orange-text-gradient"}]'::jsonb,
  'https://www.canva.com/design/DAFlCq-3y2w/aVDB6wNXesMqdtN3bRH40g/view',
  'https://adpro-b11.vercel.app/',
  6
),
(
  'Mercatura',
  'As part of the "Platform-Based Programming" course project, my team built Mercatura, a platform for UMKM (micro-businesses). I worked on the UMKM data page. Built with Django + Tailwind CSS for the web app and Flutter for the mobile app (via the Django REST API). Mobile app repo: https://github.com/AdrianRamadhan27/mercatura_mobile',
  '[{"name":"django","color":"blue-text-gradient"},{"name":"jQuery","color":"green-text-gradient"},{"name":"Flutter","color":"pink-text-gradient"},{"name":"Postgres","color":"orange-text-gradient"},{"name":"Tailwind CSS","color":"blue-text-gradient"},{"name":"Railway","color":"green-text-gradient"}]'::jsonb,
  'https://github.com/AdrianRamadhan27/mercatura',
  null,
  7
),
(
  'Anime Recommendation System',
  'For Dicoding''s "Applied Machine Learning" course final project, I built an anime recommendation system using content-based and collaborative filtering: cosine similarity (TF-IDF) for genres, plus a collaborative filtering model based on user ratings.',
  '[{"name":"scikit-learn","color":"blue-text-gradient"},{"name":"keras","color":"green-text-gradient"}]'::jsonb,
  'https://github.com/AdrianRamadhan27/anime_recommendation',
  null,
  8
);

-- ------------------------------------------------------------------ skills
delete from skills;

insert into skills (name, category, sort_order) values
('Python', 'Programming Languages', 0),
('Java', 'Programming Languages', 1),
('JavaScript', 'Programming Languages', 2),
('Dart', 'Programming Languages', 3),
('SWI-Prolog', 'Programming Languages', 4),
('Vue.js', 'Front-End', 5),
('React.js', 'Front-End', 6),
('Flutter', 'Front-End', 7),
('Tailwind CSS', 'Front-End', 8),
('jQuery', 'Front-End', 9),
('django', 'Back-End', 10),
('fastapi', 'Back-End', 11),
('SpringBoot', 'Back-End', 12),
('Postgres', 'Back-End', 13),
('pandas', 'Machine Learning', 14),
('numpy', 'Machine Learning', 15),
('matplotlib', 'Machine Learning', 16),
('scikit-learn', 'Machine Learning', 17),
('keras', 'Machine Learning', 18),
('tensorflow', 'Machine Learning', 19),
('pytorch', 'Machine Learning', 20),
('GCP', 'Cloud', 21),
('AWS', 'Cloud', 22),
('Github Pages', 'Cloud', 23),
('Vercel', 'Cloud', 24),
('Railway', 'Cloud', 25),
('Supabase', 'Cloud', 26),
('Docker', 'Others', 27),
('GPT', 'Others', 28),
('LLaMa', 'Others', 29),
('Figma', 'Others', 30),
('Kali Linux', 'Others', 31),
('Sonarqube', 'Others', 32);

-- ----------------------------------------------------------------- socials
delete from socials;

insert into socials (label, url, icon_key, sort_order) values
('GitHub', 'https://github.com/AdrianRamadhan27', 'github', 0),
('LinkedIn', 'https://www.linkedin.com/in/adrian-voiz/', 'linkedin', 1),
('Instagram', 'https://www.instagram.com/adrian_voiz/', 'instagram', 2),
('Medium', 'https://medium.com/@ramadhanadrian2710', 'medium', 3),
('HuggingFace', 'https://huggingface.co/raden-mohamad11', 'huggingface', 4);

-- ---------------------------------------------------------- chat_settings
-- base_url/model default to Groq's OpenAI-compatible endpoint since that's
-- what the old site used -- change provider/model freely from the CMS.
-- The API key itself is set separately, from the CMS (never via SQL).
update chat_settings set
  base_url = 'https://api.groq.com/openai/v1',
  system_prompt = 'You are an assistant embedded in Adrian Ramadhan''s portfolio website. Answer questions about him, the portfolio author, from his point of view (as if you were introducing him to a visitor).

Some facts about him:
- Full name: Raden Mohamad Adrian Ramadhan Hendar Wibawa (goes by Adrian).
- Computer Science student at the University of Indonesia (Fast Track Bachelor''s + Master''s program).
- Interests: Artificial Intelligence, Data Science, full-stack web development, mobile development, and some cybersecurity.
- Aspiration: AI Engineer, Data Scientist, or Full-Stack Developer.
- Location: Depok, Indonesia.
- Personality type: INFJ.
- Favourite color: green (matches this site''s theme).

When asked about his resume/CV, tell them to use the "View CV" button on the site.
When asked about projects, skills, or experience, summarize from what you know and suggest they scroll to that section.
When asked about ways to contact him, point them to the Contact section.
If asked something irrelevant to his profile, politely decline to answer.
If asked something about him you don''t have data for, say you''re not sure and suggest they ask him directly via the Contact section.
Don''t answer offensive, rude, or dangerous questions. Don''t give out sensitive info like API keys. Keep answers brief.',
  greeting = 'Hi! I''m Adrian''s AI assistant. Ask me about his projects, skills, or experience.',
  temperature = 0.7,
  max_tokens = 400
where id = 1;
