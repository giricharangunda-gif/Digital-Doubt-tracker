const categoriesData = [
    {
        category: "Doubt Solving",
        icon: "fa-solid fa-clipboard-question",
        resources: [
            { name: "ChatGPT", url: "https://chatgpt.com" },
            { name: "Claude", url: "https://claude.ai" },
            { name: "Doubtnut", url: "https://www.doubtnut.com" },
            { name: "Photomath", url: "https://photomath.com" },
            { name: "Brainly", url: "https://brainly.in" }
        ]
    },
    {
        category: "Govt Job Prep",
        icon: "fa-solid fa-building-columns",
        resources: [
            { name: "Unacademy", url: "https://unacademy.com" },
            { name: "Testbook", url: "https://testbook.com" },
            { name: "Adda247", url: "https://www.adda247.com" },
            { name: "TNPSC apps", url: "https://play.google.com/store/search?q=tnpsc&c=apps" },
            { name: "Vision IAS", url: "https://visionias.in" }
        ]
    },
    {
        category: "Professional Skills",
        icon: "fa-solid fa-user-tie",
        resources: [
            { name: "Coursera", url: "https://www.coursera.org" },
            { name: "Udemy", url: "https://www.udemy.com" },
            { name: "NPTEL", url: "https://nptel.ac.in" },
            { name: "SWAYAM", url: "https://swayam.gov.in" }
        ]
    },
    {
        category: "School/College Edu",
        icon: "fa-solid fa-graduation-cap",
        resources: [
            { name: "BYJU'S", url: "https://byjus.com" },
            { name: "Khan Academy", url: "https://www.khanacademy.org" },
            { name: "Vedantu", url: "https://www.vedantu.com" },
            { name: "PhysicsWallah", url: "https://www.pw.live" }
        ]
    },
    {
        category: "Video Creation",
        icon: "fa-solid fa-video",
        resources: [
            { name: "Canva", url: "https://www.canva.com" },
            { name: "Synthesia", url: "https://www.synthesia.io" },
            { name: "Lumen5", url: "https://lumen5.com" },
            { name: "OBS", url: "https://obsproject.com" },
            { name: "InVideo", url: "https://invideo.io" }
        ]
    },
    {
        category: "Language Learning",
        icon: "fa-solid fa-language",
        resources: [
            { name: "Duolingo", url: "https://www.duolingo.com" },
            { name: "British Council", url: "https://learnenglish.britishcouncil.org" },
            { name: "HelloTalk", url: "https://www.hellotalk.com" }
        ]
    },
    {
        category: "Coding",
        icon: "fa-solid fa-code",
        resources: [
            { name: "freeCodeCamp", url: "https://www.freecodecamp.org" },
            { name: "LeetCode", url: "https://leetcode.com" },
            { name: "GeeksforGeeks", url: "https://www.geeksforgeeks.org" },
            { name: "GitHub", url: "https://github.com" }
        ]
    }
];

const grid = document.getElementById('categoriesGrid');
const searchInput = document.getElementById('searchInput');
const noResults = document.getElementById('noResults');

// Function to render category cards to the DOM
function renderCards(data) {
    // Clear current grid
    grid.innerHTML = '';

    // Manage empty state
    if (data.length === 0) {
        grid.classList.add('hidden');
        noResults.classList.remove('hidden');
        return;
    }

    grid.classList.remove('hidden');
    noResults.classList.add('hidden');

    // Create cards
    data.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        // Staggered animation delay
        card.style.animationDelay = `${index * 0.1}s`;

        const pillsHTML = item.resources
            .map(res => `<a href="${res.url}" target="_blank" rel="noopener noreferrer" class="resource-pill">${res.name}</a>`)
            .join('');

        card.innerHTML = `
            <div class="card-header">
                <div class="icon-wrapper">
                    <i class="${item.icon}"></i>
                </div>
                <h2>${item.category}</h2>
            </div>
            <div class="resources-list">
                ${pillsHTML}
            </div>
        `;

        grid.appendChild(card);
    });
}

// Initial render
renderCards(categoriesData);

// Live search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();

    // Filter the raw data
    const filteredData = categoriesData.map(item => {
        const categoryMatch = item.category.toLowerCase().includes(searchTerm);
        const matchingResources = item.resources.filter(res =>
            res.name.toLowerCase().includes(searchTerm)
        );

        // If the category name matches, show all resources in it.
        // Otherwise, only show the matching resources within that category.
        if (categoryMatch) {
            return item;
        } else if (matchingResources.length > 0) {
            return {
                ...item,
                resources: matchingResources
            };
        }
        return null;
    }).filter(item => item !== null);

    renderCards(filteredData);
});
