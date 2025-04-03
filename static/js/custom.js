document.addEventListener('DOMContentLoaded', function () {
	// ======================
	// Global Variables
	// ======================
	const body = document.body;
	const header = document.querySelector('.header_section_top');
	const scrollUp = document.createElement('div');
	scrollUp.className = 'scroll-up';
	scrollUp.innerHTML = '<i class="fas fa-arrow-up"></i>';
	body.appendChild(scrollUp);

	// Update paths for CSS and JS files
	const cssPath = "{{ url_for('static', filename='css/style.css') }}";
	const jsPath = "{{ url_for('static', filename='js/custom.js') }}";

	// ======================
	// Mobile Menu Functionality
	// ======================
	function initMobileMenu() {
		const sidenav = document.getElementById("mySidenav");
		const openBtn = document.querySelector(".toggle_icon");
		const closeBtn = document.querySelector(".closebtn");

		function openNav() {
			sidenav.style.width = "280px";
			body.style.overflow = "hidden";
			openBtn.style.opacity = "0";
		}

		function closeNav() {
			sidenav.style.width = "0";
			body.style.overflow = "auto";
			openBtn.style.opacity = "1";
		}

		openBtn.addEventListener("click", openNav);
		closeBtn.addEventListener("click", closeNav);

		// Close menu when clicking on a link
		document.querySelectorAll('#mySidenav a').forEach(link => {
			link.addEventListener('click', () => {
				closeNav();
			});
		});
	}

	// ======================
	// Smooth Scrolling
	// ======================
	function initSmoothScroll() {
		document.querySelectorAll('a[href^="#"]').forEach(anchor => {
			anchor.addEventListener('click', function (e) {
				e.preventDefault();

				const targetId = this.getAttribute('href');
				if (targetId === '#') return;

				const targetElement = document.querySelector(targetId);
				if (targetElement) {
					window.scrollTo({
						top: targetElement.offsetTop - 80,
						behavior: 'smooth'
					});
				}
			});
		});
	}

	// ======================
	// Scroll Animations
	// ======================
	function initScrollAnimations() {
		const animateOnScroll = (elements, animationClass) => {
			elements.forEach(element => {
				const elementPosition = element.getBoundingClientRect().top;
				const screenPosition = window.innerHeight / 1.2;

				if (elementPosition < screenPosition) {
					element.classList.add(animationClass);
				}
			});
		};

		// Animate service boxes
		const serviceBoxes = document.querySelectorAll('.service_box');
		const mobileBoxes = document.querySelectorAll('.box_main');

		window.addEventListener('scroll', () => {
			animateOnScroll(serviceBoxes, 'animate-slide-up');
			animateOnScroll(mobileBoxes, 'animate-pop-in');
		});

		// Initial check in case elements are already in view
		animateOnScroll(serviceBoxes, 'animate-slide-up');
		animateOnScroll(mobileBoxes, 'animate-pop-in');
	}

	// ======================
	// Sticky Header
	// ======================
	function initStickyHeader() {
		let lastScroll = 0;

		window.addEventListener('scroll', () => {
			const currentScroll = window.pageYOffset;

			if (currentScroll <= 100) {
				header.classList.remove('header-scrolled');
				header.style.transform = 'translateY(0)';
			} else {
				header.classList.add('header-scrolled');

				// Hide header on scroll down
				if (currentScroll > lastScroll && currentScroll > 200) {
					header.style.transform = 'translateY(-100%)';
				} else {
					header.style.transform = 'translateY(0)';
				}
			}

			// Show/hide scroll to top button
			if (currentScroll > 500) {
				scrollUp.classList.add('show');
			} else {
				scrollUp.classList.remove('show');
			}

			lastScroll = currentScroll;
		});
	}

	// ======================
	// Scroll to Top
	// ======================
	function initScrollToTop() {
		scrollUp.addEventListener('click', () => {
			window.scrollTo({
				top: 0,
				behavior: 'smooth'
			});
		});
	}

	// ======================
	// Product Carousel
	// ======================
	function initProductCarousels() {
		document.querySelectorAll('.carousel').forEach(carousel => {
			const items = carousel.querySelectorAll('.carousel-item');
			let currentIndex = 0;

			function showItem(index) {
				items.forEach((item, i) => {
					item.classList.toggle('active', i === index);
				});
			}

			function nextItem() {
				currentIndex = (currentIndex + 1) % items.length;
				showItem(currentIndex);
			}

			function prevItem() {
				currentIndex = (currentIndex - 1 + items.length) % items.length;
				showItem(currentIndex);
			}

			// Auto-rotate carousel every 5 seconds
			let interval = setInterval(nextItem, 5000);

			// Pause on hover
			carousel.addEventListener('mouseenter', () => {
				clearInterval(interval);
			});

			carousel.addEventListener('mouseleave', () => {
				interval = setInterval(nextItem, 5000);
			});

			// Navigation arrows
			carousel.querySelectorAll('.carousel-control-next').forEach(arrow => {
				arrow.addEventListener('click', (e) => {
					e.preventDefault();
					nextItem();
				});
			});

			carousel.querySelectorAll('.carousel-control-prev').forEach(arrow => {
				arrow.addEventListener('click', (e) => {
					e.preventDefault();
					prevItem();
				});
			});
		});
	}

	// ======================
	// Interactive Elements
	// ======================
	function initInteractiveElements() {
		// Add ripple effect to buttons
		document.querySelectorAll('.btn_main a, .buynow_bt a').forEach(button => {
			button.addEventListener('click', function (e) {
				e.preventDefault();

				const ripple = document.createElement('span');
				ripple.className = 'ripple';

				const rect = this.getBoundingClientRect();
				const size = Math.max(rect.width, rect.height);
				const x = e.clientX - rect.left - size / 2;
				const y = e.clientY - rect.top - size / 2;

				ripple.style.width = ripple.style.height = `${size}px`;
				ripple.style.left = `${x}px`;
				ripple.style.top = `${y}px`;

				this.appendChild(ripple);

				setTimeout(() => {
					ripple.remove();
				}, 1000);
			});
		});

		// Add tooltips to social icons
		const socialIcons = document.querySelectorAll('.social-links a');
		socialIcons.forEach(icon => {
			const platform = icon.querySelector('i').className.split(' ')[1].replace('fa-', '');
			const tooltip = document.createElement('span');
			tooltip.className = 'social-tooltip';
			tooltip.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);
			icon.appendChild(tooltip);
		});
	}

	// ======================
	// Form Validation
	// ======================
	function initFormValidation() {
		const forms = document.querySelectorAll('form');

		forms.forEach(form => {
			form.addEventListener('submit', function (e) {
				let isValid = true;
				const inputs = this.querySelectorAll('input[required], textarea[required]');

				inputs.forEach(input => {
					if (!input.value.trim()) {
						input.classList.add('invalid');
						isValid = false;
					} else {
						input.classList.remove('invalid');
					}
				});

				if (!isValid) {
					e.preventDefault();
					this.querySelector('.error-message')?.remove();

					const errorMsg = document.createElement('div');
					errorMsg.className = 'error-message';
					errorMsg.textContent = 'Please fill in all required fields';
					this.appendChild(errorMsg);
				}
			});

			// Clear validation on input
			this.querySelectorAll('input, textarea').forEach(input => {
				input.addEventListener('input', () => {
					input.classList.remove('invalid');
					this.querySelector('.error-message')?.remove();
				});
			});
		});
	}

	// ======================
	// Initialize Everything
	// ======================
	function init() {
		initMobileMenu();
		initSmoothScroll();
		initScrollAnimations();
		initStickyHeader();
		initScrollToTop();
		initProductCarousels();
		initInteractiveElements();
		initFormValidation();

		// Add loaded class to body for entrance animations
		setTimeout(() => {
			body.classList.add('loaded');
		}, 100);
	}

	init();

	// Initialize Bootstrap Carousels
	var carousels = document.querySelectorAll('.carousel');
	carousels.forEach(function (carousel) {
		new bootstrap.Carousel(carousel);
	});
});

// ======================
// Helper Functions
// ======================
function debounce(func, wait = 20, immediate = true) {
	let timeout;
	return function () {
		const context = this, args = arguments;
		const later = function () {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		const callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
}