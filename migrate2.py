import re

with open("script.js", "r") as f:
    text = f.read()

text = text.replace("OUR STORY", "<img id='netflix-logo-img' style='width:100px; padding-top:10px;' />")

# We will just inject code to set the src dynamically
dashboard_hook = """function createDashboard() {
  setTimeout(() => {
    let logo = document.getElementById("netflix-logo-img");
    if(logo) logo.src = document.querySelector("link[rel=icon]").href;
  }, 100);"""
text = text.replace("function createDashboard() {", dashboard_hook)

with open("script.js", "w") as f:
    f.write(text)

print("done")
