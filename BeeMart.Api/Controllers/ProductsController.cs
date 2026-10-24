using Asp.Versioning;
using BeeMart.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BeeMart.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Authorize]
[Route("api/v{version:apiVersion}/products")]
public class ProductsController : ControllerBase
{
    private readonly BeeMartContext _db;
    public ProductsController(BeeMartContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? search)
    {
        var keyword = (search ?? "").Trim();
        if (keyword.Length == 0) return Ok(Array.Empty<object>());

        var data = await _db.MsProducts
            .Where(p => p.Stsrc && p.Name.Contains(keyword))
            .OrderBy(p => p.Name)
            .Take(10)
            .Select(p => new
            {
                idProduct = p.IdProduct,
                name = p.Name,
                weight = p.Weight,
                stock = p.Stock,
                price = p.Price,
                discount = p.Discount
            })
            .ToListAsync();

        return Ok(data);
    }
}