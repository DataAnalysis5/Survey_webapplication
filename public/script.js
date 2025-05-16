let currentUser = null
let sessionTimeout

// Add this function near the top of your script file
window.togglePassword = (inputId) => {
  const input = document.getElementById(inputId)
  const button = input.nextElementSibling
  const icon = button.querySelector("i")

  if (input.type === "password") {
    input.type = "text"
    icon.classList.remove("fa-eye")
    icon.classList.add("fa-eye-slash")
  } else {
    input.type = "password"
    icon.classList.remove("fa-eye-slash")
    icon.classList.add("fa-eye")
  }
}

// Replace the checkLoginState function with this improved version
function checkLoginState() {
  const user = JSON.parse(localStorage.getItem("user"))
  if (user && user.username) {
    // Instead of making a server request that might fail, use the stored user data
    document.getElementById("login-container").classList.add("hidden")
    document.getElementById("signup-container").classList.add("hidden")
    document.getElementById("forgot-password-container")?.classList.add("hidden")
    document.getElementById("reset-verification-container")?.classList.add("hidden")
    document.getElementById("verification-container")?.classList.add("hidden")

    // Show the navbar logout button
    document.getElementById("navbar-logout").classList.remove("hidden")

    if (user.role === "admin") {
      document.getElementById("admin-panel").classList.remove("hidden")
      loadDepartmentSurveys()
    } else {
      document.getElementById("employee-panel").classList.remove("hidden")
      loadAvailableSurveys()
    }

    // Restart the session timeout
    startSession()

    return true
  }

  // Hide the navbar logout button when not logged in
  document.getElementById("navbar-logout").classList.add("hidden")
  return false
}

// Session management
function startSession() {
  clearSession()
  sessionTimeout = setTimeout(
    () => {
      logout()
    },
    30 * 60 * 1000,
  ) // 30 minutes
}

function clearSession() {
  if (sessionTimeout) {
    clearTimeout(sessionTimeout)
  }
}

// Password validation
function validatePassword(password) {
  const minLength = 8
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*]/.test(password)

  return password.length >= minLength && hasUpper && hasLower && hasNumber && hasSpecial
}

// Add these new functions
function validateEmail(email) {
  // More permissive regex that allows various email formats
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return re.test(email)
}

window.verifyEmail = async () => {
  const email = sessionStorage.getItem("pendingVerificationEmail")
  const otpInput = document.getElementById("otp-input")
  const otp = otpInput.value.trim()

  if (!email || !otp) {
    alert("Please enter the verification code")
    return
  }

  try {
    const response = await fetch("/api/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    })

    const data = await response.json()

    if (data.success) {
      // Clear OTP field
      otpInput.value = ""
      alert("Email verified successfully! Please login.")
      sessionStorage.removeItem("pendingVerificationEmail")
      document.getElementById("verification-container").classList.add("hidden")
      showLogin()
    } else {
      // Clear OTP field on failure too
      otpInput.value = ""
      alert(data.error || "Verification failed")
    }
  } catch (error) {
    // Clear OTP field on error
    otpInput.value = ""
    console.error("Verification error:", error)
    alert("Verification failed: " + error.message)
  }
}

window.resendOTP = async () => {
  const email = sessionStorage.getItem("pendingVerificationEmail")

  if (!email) {
    alert("Please try signing up again")
    showSignup()
    return
  }

  try {
    const response = await fetch("/api/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    const data = await response.json()

    if (data.success) {
      alert("New verification code sent to your email")
    } else {
      alert(data.error || "Failed to resend verification code")
    }
  } catch (error) {
    console.error("Resend OTP error:", error)
    alert("Failed to resend verification code: " + error.message)
  }
}

// Show/Hide Forms
window.showSignup = () => {
  // Clear login form fields
  document.getElementById("username").value = ""
  document.getElementById("password").value = ""

  // Switch views
  document.getElementById("login-container").classList.add("hidden")
  document.getElementById("signup-container").classList.remove("hidden")
}

window.showLogin = () => {
  // Clear all signup form fields
  document.getElementById("new-username").value = ""
  document.getElementById("new-password").value = ""
  document.getElementById("new-email").value = ""
  document.getElementById("new-department").value = document.getElementById("new-department").options[0].value
  document.getElementById("new-tenure").value = document.getElementById("new-tenure").options[0].value
  document.getElementById("new-employee-id").value = ""

  // Switch views
  document.getElementById("signup-container").classList.add("hidden")
  document.getElementById("login-container").classList.remove("hidden")
}

// Update the signup function to skip OTP verification and show success message directly
window.signup = async () => {
  const username = document.getElementById("new-username").value.trim().toLowerCase()
  const password = document.getElementById("new-password").value
  const email = document.getElementById("new-email").value.trim()
  const department = document.getElementById("new-department").value
  const employeeId = document.getElementById("new-employee-id").value.trim()
  const tenure = document.getElementById("new-tenure").value

  if (!username || !password || !department || !email || !employeeId || !tenure) {
    alert("Please fill in all required fields")
    return
  }

  if (username.toLowerCase() === "admin" || username.toLowerCase().includes("admin")) {
    alert("This username is not allowed")
    return
  }

  if (!validatePassword(password)) {
    alert(
      "Password must be at least 8 characters long and contain uppercase, lowercase, numbers and special characters",
    )
    return
  }

  if (!validateEmail(email)) {
    alert("Please enter a valid email address")
    return
  }

  try {
    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, department, email, employeeId, tenure }),
    })

    const data = await response.json()

    if (data.success) {
      // Clear all signup form fields
      document.getElementById("new-username").value = ""
      document.getElementById("new-password").value = ""
      document.getElementById("new-email").value = ""
      document.getElementById("new-employee-id").value = ""

      // Only try to reset these if they exist and have a default option
      const deptSelect = document.getElementById("new-department")
      if (deptSelect && deptSelect.options.length > 0) {
        deptSelect.selectedIndex = 0
      }

      const tenureSelect = document.getElementById("new-tenure")
      if (tenureSelect && tenureSelect.options.length > 0) {
        tenureSelect.selectedIndex = 0
      }

      // Show success message
      const signupContainer = document.getElementById("signup-container")
      signupContainer.innerHTML = `
        <div class="success-message">
          <h4><i class="fas fa-check-circle"></i> Signup Successful!</h4>
          <p>Your account has been created successfully.</p>
          <button onclick="redirectToLogin()" class="btn">Go to Login</button>
        </div>
      `
    } else {
      alert(data.error || "Sign up failed")
    }
  } catch (error) {
    console.error("Signup error:", error)
    alert("Sign up failed: " + error.message)
  }
}

// Add a new function to handle the redirect to login
window.redirectToLogin = () => {
  // Hide the signup container with success message
  document.getElementById("signup-container").classList.add("hidden")

  // Show the login container
  document.getElementById("login-container").classList.remove("hidden")

  // Reset the signup container to its original state for future use
  const signupContainer = document.getElementById("signup-container")
  signupContainer.innerHTML = `
       <h2>Sign Up</h2>
       <div class="signup-form">
         <input type="text" id="new-username" placeholder="Employee Name" autocomplete="off"/>
         <input type="email" id="new-email" placeholder="Email" required autocomplete="off"/>
         <input type="text" id="new-employee-id" placeholder="Employee ID" required autocomplete="off"/>
         <input type="password" id="new-password" placeholder="Password" autocomplete="off"/>
         <select id="new-department" required>
           <option value="" disabled selected>Select Department</option>
           ${DEPARTMENTS.map((dept) => `<option value="${dept.value}">${dept.label}</option>`).join("")}
         </select>
         <select id="new-tenure" required>
           <option value="" disabled selected>Select Tenure</option>
           <option value="0-6 months">0-6 months</option>
           <option value="up to 1 year">up to 1 year</option>
           <option value="Less than 5 years">Less than 5 years</option>
           <option value="more than 5 years">more than 5 years</option>
           
         </select>
         <button onclick="signup()" class="signup-button">Sign Up</button>
         <div class="form-footer-wrapper">
           <span>Already have an account?</span>
           <button onclick="showLogin()" class="link-button">Login</button>
         </div>
       </div>
     `

  // Reload departments in the signup form
  loadDepartments()
}

// Update the login function to properly store user data
// In your client-side script.js
async function login() {
  const username = document.getElementById("username").value.trim().toLowerCase()
  const password = document.getElementById("password").value

  try {
    // Now username represents Employee Name
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    })
    const data = await response.json()

    if (response.ok) {
      // Store user data in localStorage with all necessary information
      localStorage.setItem("user", JSON.stringify(data.user))

      // Reset the active survey index to 0 to always start with the first survey
      localStorage.setItem("activeSurveyIndex", "0")

      currentUser = data.user
      startSession()

      // Show the navbar logout button immediately after login
      document.getElementById("navbar-logout").classList.remove("hidden")

      document.getElementById("login-container").classList.add("hidden")
      document.getElementById("signup-container").classList.add("hidden")

      if (currentUser.role === "admin") {
        document.getElementById("admin-panel").classList.remove("hidden")
        await loadDepartmentSurveys()
      } else {
        document.getElementById("employee-panel").classList.remove("hidden")
        await loadAvailableSurveys()
      }
    } else {
      alert(data.error || "Invalid credentials!")
    }
  } catch (error) {
    console.error("Login error:", error)
    alert("Login failed: " + error.message)
  }
}

// Add this function to handle question deletion
function deleteQuestion(button) {
  const questionsContainer = document.getElementById("questions-container")
  const questionInputs = questionsContainer.getElementsByClassName("question-input")

  // Only delete if there's more than one question
  if (questionInputs.length > 1) {
    const questionDiv = button.closest(".question-input")

    // If this question has options, remove them too
    const optionsContainer = questionDiv.querySelector(".options-container")
    if (optionsContainer) {
      optionsContainer.remove()
    }

    // Remove the question div
    questionDiv.remove()
  } else {
    alert("Cannot delete the last question. At least one question is required.")
  }
}

function addOptions(button) {
  const questionDiv = button.parentElement
  const questionType = questionDiv.querySelector(".question-type").value

  // Don't show options for text or star rating questions
  if (questionType === "text" || questionType === "star") {
    return
  }

  // Remove existing options container if it exists
  const existingOptions = questionDiv.querySelector(".options-container")
  if (existingOptions) {
    existingOptions.remove()
  }

  // Create new options container
  const optionsContainer = document.createElement("div")
  optionsContainer.className = "options-container"
  optionsContainer.innerHTML = `
        <div class="option-input-group">
            <input type="text" class="options-input" placeholder="Enter option" />
            <button onclick="addNewOption(this)" class="add-option-btn">+</button>
        </div>
        <span class="options-help">Add your options here. Click + to add more options.</span>
    `

  questionDiv.appendChild(optionsContainer)
}

// Add an event listener to handle question type changes
document.addEventListener("change", (e) => {
  if (e.target.classList.contains("question-type")) {
    const addOptionsButton = e.target.parentElement.querySelector("button")
    if (e.target.value === "text" || e.target.value === "star") {
      addOptionsButton.style.display = "none"
    } else {
      addOptionsButton.style.display = "inline-block"
    }
  }
})

function addNewOption(button) {
  const optionsContainer = button.closest(".options-container")
  const newOptionGroup = document.createElement("div")
  newOptionGroup.className = "option-input-group"
  newOptionGroup.innerHTML = `
        <input type="text" class="options-input" placeholder="Enter option" />
        <button onclick="removeOption(this)" class="remove-option-btn">-</button>
    `
  optionsContainer.insertBefore(newOptionGroup, optionsContainer.querySelector(".options-help"))
}

function removeOption(button) {
  button.closest(".option-input-group").remove()
}

// Update your existing addQuestion function to include the delete button
function addQuestion() {
  const questionsContainer = document.getElementById("questions-container")
  const newQuestion = document.createElement("div")
  newQuestion.className = "question-input"
  newQuestion.innerHTML = `
        <input type="text" placeholder="Question" class="question" />
        <select class="question-type">
            <option value="text">Text</option>
            <option value="radio">Multiple Choice</option>
            <option value="checkbox">Checkbox</option>
            <option value="star">Star Rating</option>
        </select>
        <button onclick="addOptions(this)">Add Options</button>
        <button onclick="deleteQuestion(this)" class="delete-btn">❌</button>
    `
  questionsContainer.appendChild(newQuestion)
}
// Handle question type change
window.handleQuestionTypeChange = (select) => {
  const optionsContainer = select.parentElement.querySelector(".options-container")
  if (select.value === "radio" || select.value === "checkbox") {
    optionsContainer.classList.remove("hidden")
  } else {
    optionsContainer.classList.add("hidden")
  }
}
// Add option function
window.addOption = (button) => {
  const optionsInput = button.previousElementSibling
  const currentOptions = optionsInput.value ? optionsInput.value.split(",") : []
  const newOption = prompt("Enter option:")

  if (newOption && newOption.trim()) {
    currentOptions.push(newOption.trim())
    optionsInput.value = currentOptions.join(",")
  }
}

// Load Department Surveys
// Update the loadDepartmentSurveys function to display surveys with the title outside the card
async function loadDepartmentSurveys() {
  try {
    // Get all available departments
    const deptResponse = await fetch("/api/departments")
    const allDepartments = await deptResponse.json()

    const container = document.getElementById("department-surveys")
    let html = ""

    // Fetch and display surveys for each department
    for (const dept of allDepartments) {
      const response = await fetch(`/api/surveys/${dept}`)
      const surveys = await response.json()

      // Filter out duplicate all-department surveys
      const uniqueSurveys = surveys.filter(
        (survey, index, self) => index === self.findIndex((s) => s._id === survey._id),
      )

      if (uniqueSurveys.length > 0) {
        html += `
                    <div class="department-section">
                        <h4>${dept}</h4>
                        ${uniqueSurveys
                          .map(
                            (survey) => `
                            <div class="survey-card" style="--survey-color: ${survey.color || "#253074"}; border-color: ${survey.color || "#253074"}">
                                <div class="survey-title-box" style="background-color: ${survey.color || "#253074"}">${survey.title}</div>
                                <p>Department: ${survey.isAllDepartments ? "All Departments" : survey.department}</p>
                                <button onclick="deleteSurvey('${survey._id}')" class="delete-button">Delete Survey</button>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                `
      }
    }

    container.innerHTML = html || "<p>No surveys available</p>"
  } catch (error) {
    console.error("Error loading department surveys:", error)
    document.getElementById("department-surveys").innerHTML = "<p>Error loading surveys</p>"
  }
}

// Delete Survey
window.deleteSurvey = async (surveyId) => {
  if (!confirm("Are you sure you want to delete this survey?")) {
    return
  }

  try {
    const response = await fetch(`/api/surveys/${surveyId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      // Remove the survey card from the UI
      const surveyCard = document.querySelector(`.survey-card[data-survey-id="${surveyId}"]`)
      if (surveyCard) {
        surveyCard.remove()
      }

      // Refresh the surveys display
      await loadDepartmentSurveys()
      await displayActiveSurveys()
    } else {
      const data = await response.json()
      alert(data.error || "Failed to delete survey")
    }
  } catch (error) {
    console.error("Delete error:", error)
    alert("Error deleting survey: " + error.message)
  }
}

// Create Survey
window.createSurvey = async () => {
  const isAllDepartments = document.getElementById("all-departments-checkbox")?.checked
  const department = isAllDepartments ? "all" : document.getElementById("department").value
  const title = document.getElementById("survey-title").value
  const color = document.getElementById("survey-color").value // Get the color value

  if (!title) {
    alert("Please enter a survey title")
    return
  }

  const questions = []
  let isValid = true

  document.querySelectorAll(".question-input").forEach((questionDiv) => {
    const questionText = questionDiv.querySelector(".question").value
    const questionType = questionDiv.querySelector(".question-type").value

    if (!questionText) {
      alert("Please fill in all questions")
      isValid = false
      return
    }

    const question = {
      text: questionText,
      type: questionType,
    }

    // Only validate options for radio and checkbox questions
    if (questionType === "radio" || questionType === "checkbox") {
      const optionInputs = questionDiv.querySelectorAll(".options-input")
      const options = []

      optionInputs.forEach((input) => {
        if (input.value.trim()) {
          options.push(input.value.trim())
        }
      })

      if (options.length < 2) {
        alert("Please provide at least 2 options for multiple choice/checkbox questions")
        isValid = false
        return
      }
      question.options = options
    }

    questions.push(question)
  })

  if (!isValid || questions.length === 0) return

  try {
    const response = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        department,
        title,
        questions,
        isAllDepartments,
        color, // Include the color in the request
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Failed to create survey")
    }

    alert(isAllDepartments ? "Survey created successfully for all departments!" : "Survey created successfully!")

    // Only try to display active surveys if the element exists
    if (document.getElementById("active-surveys")) {
      await displayActiveSurveys()
    }
    await loadDepartmentSurveys()
    clearSurveyForm()
  } catch (error) {
    console.error("Survey creation error:", error)
    alert("Error creating survey: " + error.message)
  }
}

// Display Active Surveys
async function displayActiveSurveys() {
  try {
    const response = await fetch("/api/surveys/active")
    const surveys = await response.json()

    const container = document.getElementById("active-surveys")
    // Check if container exists before setting innerHTML
    if (!container) {
      console.warn("active-surveys container not found")
      return
    }

    container.innerHTML = surveys
      .map(
        (survey) => `
            <div class="survey-card">
                <h4>${survey.title}</h4>
                <p>Department: ${survey.department}</p>
                <p>Created: ${new Date(survey.createdAt).toLocaleDateString()}</p>
            </div>
        `,
      )
      .join("")
  } catch (error) {
    console.error("Error loading active surveys:", error)
  }
}

// Fix the survey ordering issue in the displayAvailableSurveys function
// Find the displayAvailableSurveys function and modify the sorting logic

// Find the displayAvailableSurveys function and modify it to ensure proper ordering
// Replace the existing displayAvailableSurveys function with this updated version

// Update the submitSurvey function to only show success message after the last survey
window.submitSurvey = async (event, surveyId) => {
  event.preventDefault()
  const form = event.target
  const formData = new FormData(form)
  const answers = new Map()

  // Get all questions in the form
  const questions = form.querySelectorAll(".survey-question")
  const totalQuestions = questions.length
  let answeredQuestions = 0

  // Collect all answers from the form
  for (const [name, value] of formData.entries()) {
    if (name.startsWith("q")) {
      answers.set(name, value)
      answeredQuestions++
    }
  }

  // Handle checkbox inputs separately
  const checkboxGroups = new Map()
  form.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    const name = checkbox.name
    if (!checkboxGroups.has(name)) {
      checkboxGroups.set(name, [])
    }

    if (checkbox.checked) {
      const values = checkboxGroups.get(name)
      values.push(checkbox.value)
      checkboxGroups.set(name, values)
    }
  })

  // Add checkbox answers to the answers map
  checkboxGroups.forEach((values, name) => {
    if (values.length > 0) {
      answers.set(name, values)
      answeredQuestions++
    }
  })

  // Check if all questions are answered
  if (answeredQuestions < totalQuestions) {
    alert("Please fill all questions")
    return
  }

  // Convert answers Map to regular object
  const answersObject = {}
  answers.forEach((value, key) => {
    answersObject[key] = Array.isArray(value) ? value.join(", ") : value
  })

  try {
    const response = await fetch("/api/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surveyId,
        userId: currentUser.username,
        department: currentUser.department,
        answers: answersObject,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      const surveyCard = form.closest(".survey-card")

      // Clear the survey card content
      surveyCard.innerHTML = ""

      // Get the total number of available surveys
      const availableSurveysResponse = await fetch(`/api/surveys/${currentUser.department}`)
      const allSurveys = await availableSurveysResponse.json()

      // Get submitted surveys
      const submittedResponse = await fetch(`/api/responses/user/${currentUser.username}`)
      const submittedSurveys = await submittedResponse.json()

      // Filter out submitted surveys (including the one just submitted)
      const submittedSurveyIds = new Set([
        ...submittedSurveys.map((response) => response.surveyId),
        surveyId, // Include the current survey that was just submitted
      ])

      const remainingSurveys = allSurveys.filter((survey) => !submittedSurveyIds.has(survey._id))

      // Check if this was the last survey
      const isLastSurvey = remainingSurveys.length === 0

      if (isLastSurvey) {
        // Show success message ONLY if this was the last survey
        const successDiv = document.createElement("div")
        successDiv.className = "success-message"
        successDiv.setAttribute("role", "alert")
        successDiv.innerHTML = `
          <h4><i class="fas fa-check-circle"></i> Survey Submitted Successfully!</h4>
          <p>Thank you for your response.</p>
        `
        surveyCard.appendChild(successDiv)
      }

      // Update the activeIndex for the next survey
      if (!isLastSurvey) {
        localStorage.setItem("activeSurveyIndex", "0") // Always reset to the first remaining survey
      }

      // Wait and then refresh surveys
      setTimeout(async () => {
        await displayAvailableSurveys()
      }, 2000)
    } else {
      throw new Error(data.error || "Failed to submit survey")
    }
  } catch (error) {
    console.error("Survey submission error:", error)
    alert("Error submitting survey: " + error.message)
  }
}

// Update the displayAvailableSurveys function to show "Survey 1 of n" by default
async function displayAvailableSurveys() {
  try {
    // Make sure currentUser is available
    if (!currentUser) {
      currentUser = JSON.parse(localStorage.getItem("user"))
      if (!currentUser) {
        console.error("No user data found")
        return
      }
    }

    const container = document.getElementById("available-surveys")
    if (!container) {
      console.warn("available-surveys container not found")
      return
    }

    // First get the submitted surveys by the current user
    const submittedResponse = await fetch(`/api/responses/user/${currentUser.username}`)
    const submittedSurveys = await submittedResponse.json()

    // Create a Set of submitted survey IDs for easy lookup
    const submittedSurveyIds = new Set(submittedSurveys.map((response) => response.surveyId))

    // Get available surveys for the user's department
    const response = await fetch(`/api/surveys/${currentUser.department}`)
    const surveys = await response.json()

    // Filter out submitted surveys and ensure proper sequential ordering
    const availableSurveys = surveys
      .filter((survey) => !submittedSurveyIds.has(survey._id))
      // Sort by createdAt date to ensure consistent ordering
      .sort((a, b) => {
        // First try to sort by createdAt date
        if (a.createdAt && b.createdAt) {
          return new Date(a.createdAt) - new Date(b.createdAt)
        }
        // Fallback to _id comparison if createdAt is not available
        return a._id.localeCompare(b._id)
      })

    if (availableSurveys.length === 0) {
      container.innerHTML = `
        <div class="no-surveys-message">
          <p>No new surveys available at this time.</p>
        </div>
      `
      return
    }

    // Get the active survey index from localStorage
    let activeIndex = Number.parseInt(localStorage.getItem("activeSurveyIndex") || "0")

    // Make sure activeIndex is within bounds
    if (activeIndex >= availableSurveys.length) {
      activeIndex = 0
      localStorage.setItem("activeSurveyIndex", "0")
    }

    // Display the active survey
    const activeSurvey = availableSurveys[activeIndex]

    container.innerHTML = `
      <div class="survey-card" style="--survey-color: ${activeSurvey.color || "#253074"}; border-color: ${activeSurvey.color || "#253074"}">
        <div class="survey-title-box" style="background-color: ${activeSurvey.color || "#253074"}">${activeSurvey.title}</div>
        <form onsubmit="submitSurvey(event, '${activeSurvey._id}')">
          <div class="survey-questions-container">
            ${generateSurveyColumns(activeSurvey.questions, activeSurvey.color)}
          </div>
          <div class="center-submit">
            <button type="submit" style="background-color: ${activeSurvey.color || "#253074"}">Submit Survey</button>
          </div>
        </form>
      </div>
      <div class="survey-counter">Survey ${activeIndex + 1} of ${availableSurveys.length}</div>
      ${
        availableSurveys.length > 1
          ? `<div class="survey-navigation">
               <button onclick="navigateSurvey('prev')" class="nav-button" ${activeIndex === 0 ? "disabled" : ""} style="background-color: ${activeSurvey.color || "#253074"}">Previous</button>
               <button onclick="navigateSurvey('next')" class="nav-button" ${activeIndex === availableSurveys.length - 1 ? "disabled" : ""} style="background-color: ${activeSurvey.color || "#253074"}">Next</button>
             </div>`
          : ""
      }
    `
    container.insertAdjacentHTML('beforeend', '<div class="answer-progress"></div>');
    updateAnswerProgress();
  } catch (error) {
    console.error("Error loading available surveys:", error)
    const container = document.getElementById("available-surveys")
    if (container) {
      container.innerHTML = "<p>Error loading surveys. Please try again later.</p>"
    }
  }
}

// Add a new function to handle survey navigation
window.navigateSurvey = (direction) => {
  // Check if all questions in current survey are answered
  const currentForm = document.querySelector("#available-surveys form")
  const questions = currentForm.querySelectorAll(".survey-question")
  let allAnswered = true

  questions.forEach((question) => {
    const questionType = question.dataset.type
    let isAnswered = false

    switch (questionType) {
      case "radio":
        isAnswered = question.querySelector("input[type='radio']:checked") !== null
        break
      case "checkbox":
        isAnswered = question.querySelector("input[type='checkbox']:checked") !== null
        break
      case "text":
        const textInput = question.querySelector("input[type='text'], textarea")
        isAnswered = textInput && textInput.value.trim() !== ""
        break
      case "star":
        isAnswered = question.querySelector("input[type='radio']:checked") !== null
        break
    }

    if (!isAnswered) {
      allAnswered = false
    }
  })

  if (!allAnswered && direction === "next") {
    alert("Please answer all questions before proceeding to the next survey.")
    return
  }

  // Get current index
  let currentIndex = Number.parseInt(localStorage.getItem("activeSurveyIndex") || "0")

  // Update index based on direction
  if (direction === "prev" && currentIndex > 0) {
    currentIndex--
  } else if (direction === "next") {
    currentIndex++
  }

  // Save new index and refresh display
  localStorage.setItem("activeSurveyIndex", currentIndex.toString())
  displayAvailableSurveys()
}
// Export Responses
window.exportResponses = async () => {
  try {
    const response = await fetch("/api/responses/export")
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "survey_responses.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    alert("Error exporting responses: " + error.message)
  }
}

window.generateAnalysis = async () => {
  try {
    const response = await fetch("/api/responses/analysis")
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "survey_analysis.pdf"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    alert("Error generating analysis: " + error.message)
  }
}

// Update the logout function to properly clear session data
function logout() {
  try {
    // Clear all stored data
    localStorage.removeItem("user")
    sessionStorage.clear()
    currentUser = null
    clearSession()

    // Hide all panels
    document.getElementById("admin-panel").classList.add("hidden")
    document.getElementById("employee-panel").classList.add("hidden")
    document.getElementById("signup-container").classList.add("hidden")
    document.getElementById("forgot-password-container")?.classList.add("hidden")
    document.getElementById("reset-verification-container")?.classList.add("hidden")
    document.getElementById("verification-container")?.classList.add("hidden")
    document.getElementById("navbar-logout").classList.add("hidden")

    // Show login container
    document.getElementById("login-container").classList.remove("hidden")

    // Clear all input fields
    document.getElementById("username").value = ""
    document.getElementById("password").value = ""
    document.getElementById("new-username").value = ""
    document.getElementById("new-password").value = ""

    // Clear any survey forms if they exist
    const surveyTitle = document.getElementById("survey-title")
    if (surveyTitle) surveyTitle.value = ""

    const questionsContainer = document.getElementById("questions-container")
    if (questionsContainer) {
      questionsContainer.innerHTML = ""
      addQuestion() // Add a default question
    }

    // Send logout request to server to invalidate session
    fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    }).catch((err) => {
      console.error("Logout request error:", err)
      // Continue with client-side logout even if server request fails
    })
  } catch (error) {
    console.error("Error during logout:", error)
    // Fallback logout mechanism
    localStorage.removeItem("user")
    sessionStorage.clear()
    window.location.reload()
  }
}

// Helper Functions
// Update the generateQuestionInput function to improve the star rating display
function generateQuestionInput(question, index, surveyColor = "#253074") {
  // Create the container with data-type attribute
  const questionContainer = `
        <div class="survey-question" data-type="${question.type}">
            <div class="question-container">
                <span class="bullet-point" style="color: ${surveyColor}">•</span>
                <span class="question-text">${question.text}</span>
            </div>
    `;

  let inputHtml = '';
  switch (question.type) {
      case 'text':
          inputHtml = `<input type="text" name="q${index}" required class="response-input" />`;
          break;
      case 'radio':
          inputHtml = `
              <div class="radio-buttons-container">
                  ${question.options.map(option => `
                      <div class="radio-button">
                          <input type="radio" id="q${index}_${option}" name="q${index}" value="${option}" required>
                          <label for="q${index}_${option}">${option}</label>
                      </div>
                  `).join('')}
              </div>
          `;
          break;
      case 'checkbox':
          inputHtml = `
              <div class="checkbox-buttons-container">
                  ${question.options.map(option => `
                      <div class="checkbox-button">
                          <input type="checkbox" id="q${index}_${option}" name="q${index}" value="${option}">
                          <label for="q${index}_${option}">${option}</label>
                      </div>
                  `).join('')}
              </div>
          `;
          break;
      case 'star':
          inputHtml = `
              <div class="star-rating-container">
                  ${[5,4,3,2,1].map(star => `
                      <div class="star-rating-option">
                          <input type="radio" id="q${index}_${star}" name="q${index}" value="${star}" required>
                          <label for="q${index}_${star}">
                              ${'★'.repeat(star)}${'☆'.repeat(5-star)}
                          </label>
                      </div>
                  `).join('')}
              </div>
          `;
          break;
  }

  return questionContainer + inputHtml + '</div>';
}

function clearSurveyForm() {
  document.getElementById("survey-title").value = ""
  document.getElementById("questions-container").innerHTML = ""
  addQuestion()
}

function addAllDepartmentsOption() {
  const surveyForm = document.querySelector("#create-survey-form")
  const departmentSelect = document.getElementById("department")

  // Create the checkbox container
  const checkboxContainer = document.createElement("div")
  checkboxContainer.className = "all-departments-option"
  checkboxContainer.innerHTML = `
        <label>
            <input type="checkbox" id="all-departments-checkbox" onchange="handleAllDepartments(this)">
            Apply to all departments
        </label>
    `

  // Insert after department select
  departmentSelect.parentNode.insertBefore(checkboxContainer, departmentSelect.nextSibling)
}

function handleAllDepartments(checkbox) {
  const departmentSelect = document.getElementById("department")
  departmentSelect.disabled = checkbox.checked
  if (checkbox.checked) {
    departmentSelect.value = "all"
  }
}

// Add event listeners for page visibility changes to maintain session
document.addEventListener("DOMContentLoaded", () => {
  loadDepartments()
  addQuestion()
  addAllDepartmentsOption()

  // Check login state when page loads
  checkLoginState()

  // Add visibility change listener to handle tab switching/reopening
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      // When tab becomes visible again, check login state
      checkLoginState()
    }
  })

  // Update the login form HTML generation
  document.getElementById("login-container").querySelector(".login-form").innerHTML = `
    <input type="text" id="username" placeholder="Employee Name" autocomplete="off" />
    <div class="password-container">
        <input type="password" id="password" placeholder="Password" autocomplete="off"/>
        <button type="button" class="password-toggle" onclick="togglePassword('password')">
            <i class="fas fa-eye"></i>
        </button>
    </div>
    <button onclick="login()">Login</button>
    <div class="form-footer">
        <p>Don't have an account? <button onclick="showSignup()" class="link-button">Sign Up</button></p>
        <button onclick="showForgotPassword()" class="link-button">Forgot Password?</button>
    </div>
  `

  // Update the signup form HTML generation
  document.getElementById("signup-container").querySelector(".signup-form").innerHTML = `
    <input type="text" id="new-username" placeholder="Employee Name" autocomplete="off" />
    <input type="email" id="new-email" placeholder="Email" required autocomplete="off" />
    <input type="text" id="new-employee-id" placeholder="Employee ID" required autocomplete="off" />
    <div class="password-container">
        <input type="password" id="new-password" placeholder="Password" autocomplete="off"/>
        <button type="button" class="password-toggle" onclick="togglePassword('new-password')">
            <i class="fas fa-eye"></i>
        </button>
    </div>
    <select id="new-department" autocomplete="off">
        <option value="" disabled selected>Select Department</option>
        ${DEPARTMENTS.map((dept) => `<option value="${dept.value}">${dept.label}</option>`).join("")}
    </select>
    <select id="new-tenure" required autocomplete="off">
        <option value="" disabled selected>Select Tenure</option>
        <option value="0-6 months">0-6 months</option>
        <option value="up to 1 year">up to 1 year</option>
        <option value="Less than 5 years">Less than 5 years</option>
        <option value="more than 5 years">more than 5 years</option>
    </select>
    <button onclick="signup()">Sign Up</button>
    <div class="login-prompt">
        <span>Already have an account?</span>
        <button onclick="showLogin()" class="link-button">Login</button>
    </div>
    <p class="form-footer"></p>
  `

  // Add the active-surveys container to the admin panel if it doesn't exist
  const adminPanel = document.getElementById("admin-panel")
  if (adminPanel && !document.getElementById("active-surveys")) {
    const surveysListDiv = adminPanel.querySelector(".surveys-list")
    if (surveysListDiv) {
      const activeSurveysDiv = document.createElement("div")
      activeSurveysDiv.id = "active-surveys"
      // activeSurveysDiv.innerHTML = "<h3>Active Surveys</h3>"
      surveysListDiv.appendChild(activeSurveysDiv)
    }
  }
})

// Update the existing mousemove event listener
document.addEventListener("DOMContentLoaded", () => {
  document.body.addEventListener("mousemove", (e) => {
    // Handle radio buttons
    const radioLabels = document.querySelectorAll(".radio .name")
    radioLabels.forEach((label) => {
      const rect = label.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / label.offsetWidth) * 100
      const y = ((e.clientY - rect.top) / label.offsetHeight) * 100
      label.style.setProperty("--x", `${x}%`)
      label.style.setProperty("--y", `${y}%`)
    })

    // Handle checkboxes with the same effect
    const checkboxLabels = document.querySelectorAll(".checkbox .name")
    checkboxLabels.forEach((label) => {
      const rect = label.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / label.offsetWidth) * 100
      const y = ((e.clientY - rect.top) / label.offsetHeight) * 100
      label.style.setProperty("--x", `${x}%`)
      label.style.setProperty("--y", `${y}%`)
    })
  })
})

const DEPARTMENTS = [
  { value: "IT", label: "IT" },
  { value: "HR", label: "HR" },
  { value: "Finance", label: "Finance" },
  { value: "Marketing", label: "Marketing" },
  { value: "Learning and Training", label: "Learning and Training" },
  { value: "Franchise", label: "Franchise" },
  { value: "Sales and Support", label: "Sales and Support" },
  { value: "Product Development", label: "Product Development" },
  { value: "Accounts", label: "Accounts" },
  { value: "Dispatch", label: "Dispatch" },
  { value: "E-commerce", label: "E-commerce" },
  { value: "Executive Assistant", label: "Executive Assistant" },
  { value: "Franchise Sales", label: "Franchise Sales" },
  { value: "Franchise Merchandiser", label: "Franchise Merchandiser" },
  { value: "Franchise Operation", label: "Franchise Operation" },
  { value: "Gold Dept", label: "Gold Dept" },
  { value: "Photography", label: "Photography" },
  { value: "Store", label: "Store" },
  { value: "SNMCC", label: "SNMCC" },
]

// Then modify the loadDepartments function
async function loadDepartments() {
  try {
    const departmentSelects = ["new-department", "department"] // Both signup and admin panel selects

    departmentSelects.forEach((selectId) => {
      const select = document.getElementById(selectId)
      if (select) {
        // Clear existing options
        select.innerHTML = ""

        // Add default option
        const defaultOption = document.createElement("option")
        defaultOption.value = ""
        defaultOption.textContent = "Select Department"
        defaultOption.disabled = true
        defaultOption.selected = true
        select.appendChild(defaultOption)

        // Add departments from the constant
        DEPARTMENTS.forEach((dept) => {
          const option = document.createElement("option")
          option.value = dept.value
          option.textContent = dept.label
          select.appendChild(option)
        })
      }
    })
  } catch (error) {
    console.error("Error loading departments:", error)
  }
}

// Show forgot password form
window.showForgotPassword = () => {
  document.getElementById("login-container").classList.add("hidden")
  document.getElementById("forgot-password-container").classList.remove("hidden")
}

// Request password reset
window.requestPasswordReset = async () => {
  const email = document.getElementById("reset-email").value.trim()

  if (!email || !validateEmail(email)) {
    alert("Please enter a valid email address")
    return
  }

  try {
    const response = await fetch("/api/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    const data = await response.json()

    if (data.success) {
      // Store email for reset verification
      sessionStorage.setItem("resetEmail", email)

      // Show reset verification form
      document.getElementById("forgot-password-container").classList.add("hidden")
      document.getElementById("reset-verification-container").classList.remove("hidden")
      alert("Please check your email for the reset code")
    } else {
      alert(data.error || "Failed to request password reset")
    }
  } catch (error) {
    console.error("Password reset request error:", error)
    alert("Error requesting password reset: " + error.message)
  }
}

// Verify reset code and set new password
window.verifyAndResetPassword = async () => {
  const email = sessionStorage.getItem("resetEmail")
  const resetCode = document.getElementById("reset-code").value.trim()
  const newPassword = document.getElementById("new-reset-password").value

  if (!email) {
    alert("Please request a new reset code")
    showForgotPassword()
    return
  }

  if (!resetCode) {
    alert("Please enter the reset code")
    return
  }

  if (!validatePassword(newPassword)) {
    alert(
      "Password must be at least 8 characters long and contain uppercase, lowercase, numbers and special characters",
    )
    return
  }

  try {
    const response = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        resetCode,
        newPassword,
      }),
    })

    const data = await response.json()

    if (data.success) {
      alert("Password reset successful! Please login with your new password.")
      sessionStorage.removeItem("resetEmail")
      document.getElementById("reset-verification-container").classList.add("hidden")
      showLogin()
    } else {
      alert(data.error || "Failed to reset password")
    }
  } catch (error) {
    console.error("Password reset error:", error)
    alert("Error resetting password: " + error.message)
  }
}

// Add this function after displayAvailableSurveys
// Also update the loadAvailableSurveys function to handle missing user data
async function loadAvailableSurveys() {
  try {
    // Make sure currentUser is available
    if (!currentUser) {
      currentUser = JSON.parse(localStorage.getItem("user"))
      if (!currentUser) {
        console.error("No user data found")
        return // Just return without trying to access user properties
      }
    }

    // Always reset to the first survey when loading available surveys
    localStorage.setItem("activeSurveyIndex", "0")

    await displayAvailableSurveys()
  } catch (error) {
    console.error("Error loading available surveys:", error)
    const container = document.getElementById("available-surveys")
    if (container) {
      container.innerHTML = "<p>Error loading surveys. Please try again later.</p>"
    }
  }
}

// Declare the variables
window.showLogin =
  window.showLogin ||
  (() => {
    console.log("showLogin function called")
  })

window.showSignup =
  window.showSignup ||
  (() => {
    console.log("showSignup function called")
  })

window.showForgotPassword =
  window.showForgotPassword ||
  (() => {
    console.log("showForgotPassword function called")
  })

// Add event listener for star rating
document.addEventListener("DOMContentLoaded", () => {
  // Delegate event listener for star ratings
  document.body.addEventListener("click", (e) => {
    if (e.target.closest(".star-rating-option")) {
      const starOption = e.target.closest(".star-rating-option")
      const starRow = starOption.parentElement
      const allStars = starRow.querySelectorAll(".star-rating-option")
      const input = starOption.querySelector("input")

      // Reset all stars
      allStars.forEach((star) => {
        star.style.color = "#ccc"
      })

      // Find the index of the clicked star
      const starIndex = Array.from(allStars).indexOf(starOption)

      // Color this star and all stars before it
      for (let i = 0; i <= starIndex; i++) {
        allStars[i].style.color =
          getComputedStyle(document.documentElement).getPropertyValue("--survey-color") || "#253074"
      }

      // Select the radio input
      input.checked = true
    }
  })

  // Add a new event listener for radio button deselection
  document.body.addEventListener("click", (e) => {
    // Check if a radio button label was clicked
    const radioLabel = e.target.closest(".radio-button__label")
    if (radioLabel) {
      const radioInput = document.getElementById(radioLabel.getAttribute("for"))

      // If the radio button is already checked, uncheck it
      if (radioInput && radioInput.checked) {
        // We need to prevent the default behavior and then uncheck
        e.preventDefault()
        setTimeout(() => {
          radioInput.checked = false
        }, 0)
      }
    }
  })
})

// Add this helper function to generate survey columns
function generateSurveyColumns(questions, surveyColor) {
  // Group questions into columns (maximum 5 questions per column)
  const questionsPerColumn = 5
  const columns = []
  let currentColumn = []

  questions.forEach((question, index) => {
    currentColumn.push(generateQuestionInput(question, index, surveyColor))

    // Start a new column after every 5 questions or at the end
    if ((index + 1) % questionsPerColumn === 0 || index === questions.length - 1) {
      columns.push(currentColumn)
      currentColumn = []
    }
  })

  return columns
    .map(
      (column) => `
      <div class="survey-question-column">
          ${column.join("")}
      </div>
  `,
    )
    .join("")
}


function updateAnswerProgress() {
    const form = document.querySelector('#available-surveys form');
    if (!form) return;

    const questions = form.querySelectorAll('.survey-question');
    let answeredCount = 0;
    
    questions.forEach(question => {
        const questionType = question.dataset.type;
        let isAnswered = false;
        
        switch(questionType) {
            case 'radio':
            case 'star':
                isAnswered = question.querySelector('input[type="radio"]:checked') !== null;
                break;
            case 'checkbox':
                isAnswered = question.querySelector('input[type="checkbox"]:checked') !== null;
                break;
            case 'text':
                const textInput = question.querySelector('input[type="text"], textarea');
                isAnswered = textInput && textInput.value.trim() !== '';
                break;
        }
        
        if (isAnswered) {
            answeredCount++;
            question.classList.remove('highlight-required');
        } else {
            question.classList.add('highlight-required');
        }
    });

    // Update progress indicator if it exists
    const progressIndicator = document.querySelector('.answer-progress');
    if (progressIndicator) {
        progressIndicator.textContent = `Questions answered: ${answeredCount}/${questions.length}`;
    }
}

// Add event listeners for all input types
document.addEventListener('change', function(e) {
    if (e.target.closest('.survey-question')) {
        updateAnswerProgress();
    }
});