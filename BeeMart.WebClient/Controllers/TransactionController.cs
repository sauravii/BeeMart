using Microsoft.AspNetCore.Mvc;

namespace BeeMart.WebClient.Controllers;

public class TransactionController : Controller
{
    public IActionResult Index() => View();
}