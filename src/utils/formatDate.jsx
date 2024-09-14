export const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { year: "numeric", month: "short" }; // "short" for 3-letter month
    return date.toLocaleDateString("en-US", options);
};