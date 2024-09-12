import React from "react";
import emailjs from '@emailjs/browser';
import { useState } from "react";
const Contact = () => {
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
			<div className="bg-opacity-75 dark:bg-opacity-75 rounded-md shadow-lg  flex flex-col bg-white dark:bg-black text-black dark:text-white gap-3 m-10 md:m-16 h-fit text-center p-5 hover:scale-105 duration-300">
				<h1 className="text-2xl font-bold">Get in touch with me</h1>
				<p>or directly through my email <a className="text-blue-700 hover:text-blue-500" href="mailto:ramadhanadrian2710@gmail.com" target="_blank">ramadhanadrian2710@gmail.com</a></p>
				<form id="contact-form" onSubmit={sendEmail} className="p-7">
					<div className="grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 gap-3 mb-3">
						<div class="flex flex-col gap-2 text-left">
							<label htmlFor="name">Name</label>
							<input placeholder="Your Full Name" required type="text" name="from_name" id="name" className="p-2 rounded-md bg-green-900 dark:bg-white text-white dark:text-black "/>
						</div>

						<div class="flex flex-col gap-2 text-left">
							<label htmlFor="email">Email</label>
							<input placeholder="Your Email" required type="email" name="from_email" id="email" className="p-2 rounded-md bg-green-900 dark:bg-white text-white dark:text-black"/>
						</div>
					</div>

					<div class="flex flex-col gap-2 text-left mb-6">
						<label htmlFor="message">Message</label>
						<textarea placeholder="Ask or Request Anything" required name="message" id="message" className="p-2 rounded-md bg-green-900 dark:bg-white text-white dark:text-black"/>
					</div>

					<input type="submit" value="Send" disabled={isSubmitting} className="w-fit cursor-pointer bg-green-700 px-3 py-2 mb-2 rounded-md text-white hover:bg-green-500 hover:scale-110 duration-300"/>
					{stateMessage && <p>{stateMessage}</p>}
				</form>
			</div>
			
		</div>

	);
}

export default Contact;