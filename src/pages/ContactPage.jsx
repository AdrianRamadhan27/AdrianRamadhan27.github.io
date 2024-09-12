import React from "react";
import emailjs from '@emailjs/browser';
import { useState } from "react";
import Contact from "../components/layout/Contact";
const ContactPage = () => {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [stateMessage, setStateMessage] = useState(null);

	const sendEmail = (e) => {
		e.persist();
		e.preventDefault();
		setIsSubmitting(true);
		emailjs
		.sendForm(
			import.meta.env.VITE_EMAILJS_SERVICE_ID,
			import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
			e.target,
			import.meta.env.VITE_EMAILJS_PUBLIC_KEY
		)
		.then(
			(result) => {
			setStateMessage('Message sent!');
			setIsSubmitting(false);
			setTimeout(() => {
				setStateMessage(null);
			}, 5000); // hide message after 5 seconds
			},
			(error) => {
			setStateMessage('Something went wrong, please try again later');
			setIsSubmitting(false);
			setTimeout(() => {
				setStateMessage(null);
			}, 5000); // hide message after 5 seconds
			}
		);
		
		// Clears the form after sending the email
		e.target.reset();
	};
  
	return (
		<div className="h-screen overflow-y-auto bg-gradient-to-r from-white via-green-200 to-green-400 dark:bg-gradient-to-r dark:from-green-300 dark:via-green-600 dark:to-green-900">
			<Contact />
		</div>

	);
}

export default ContactPage;