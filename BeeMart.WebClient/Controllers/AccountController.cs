using Microsoft.AspNetCore.Mvc;

namespace BeeMart.WebClient.Controllers;

public class AccountController : Controller
{
    public IActionResult Index() => RedirectToAction(nameof(Login));
    public IActionResult Login() => View();
    public IActionResult Register() => View();
}