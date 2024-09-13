import TechStacks from "../components/layout/TechStacks";
import Contact from "../components/layout/Contact";
import Profile from "../components/layout/Profile";


const HomePage = () => {

	return (
        <div className="h-full overflow-y-auto bg-gradient-to-r from-white via-green-200 to-green-400 dark:bg-gradient-to-r dark:from-green-300 dark:via-green-600 dark:to-green-900 ">

			<Profile />

			<TechStacks />

			<Contact />
			
		</div>
	);
};

export default HomePage;