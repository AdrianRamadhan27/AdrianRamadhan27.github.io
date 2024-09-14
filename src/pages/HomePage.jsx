import TechStacks from "../components/layout/TechStacks";
import Contact from "../components/layout/Contact";
import Profile from "../components/layout/Profile";
import AllProjects from "../components/layout/AllProjects";

const HomePage = () => {

	return (
        <div>

			<Profile />

			<TechStacks viewMore/>

			<AllProjects text="Latest Projects" size={3}/>


			<Contact />

			
			
		</div>
	);
};

export default HomePage;