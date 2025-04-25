// Main JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded successfully!');
    
    // Example function to toggle a mobile menu
    const toggleMenu = () => {
        const menuBtn = document.querySelector('.menu-toggle');
        const mobileMenu = document.querySelector('.mobile-menu');
        
        if (menuBtn && mobileMenu) {
            menuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('active');
            });
        }
    };
    
    // Example function for smooth scrolling
    const initSmoothScroll = () => {
        const scrollLinks = document.querySelectorAll('a.scroll-link');
        
        scrollLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 70,
                        behavior: 'smooth'
                    });
                }
            });
        });
    };
    
    // Initialize functions
    toggleMenu();
    initSmoothScroll();
}); 