using System.Globalization;
using Asp.Versioning;
using BeeMart.Api.Dtos;
using BeeMart.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BeeMart.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Authorize]
[Route("api/v{version:apiVersion}/transactions")]
public class TransactionsController : ControllerBase
{
    private readonly BeeMartContext _db;
    public TransactionsController(BeeMartContext db) => _db = db;

    private string CurrentUserId => User.FindFirst("IdUser")!.Value;

    // Format: [5 digit IdUser][ddMMyy][3 digit nomor urut hari itu]
    private async Task<string> BuildNextInvoiceAsync(string idUser)
    {
        var now = DateTime.Now;
        var start = now.Date;
        var end = start.AddDays(1);

        var count = await _db.TrTransactions
            .CountAsync(t => t.TransactionDate >= start && t.TransactionDate < end);

        var prefix = idUser + now.ToString("ddMMyy", CultureInfo.InvariantCulture);
        var running = count + 1;
        string invoice;
        do
        {
            invoice = prefix + running.ToString("D3");
            running++;
        }
        while (await _db.TrTransactions.AnyAsync(t => t.InvoiceNo == invoice));

        return invoice;
    }

    [HttpGet("next-invoice")]
    public async Task<IActionResult> NextInvoice()
    {
        var invoice = await BuildNextInvoiceAsync(CurrentUserId);
        return Ok(new { invoiceNo = invoice });
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateTransactionRequest req)
    {
        if (req.Items == null || req.Items.Count == 0)
            return BadRequest(new { message = "Daftar belanjaan masih kosong" });

        if (req.Items.Any(i => i.Qty <= 0))
            return BadRequest(new { message = "Qty harus lebih dari 0" });

        var paymentOk = await _db.LtPaymentMethods
            .AnyAsync(p => p.IdPaymentMethod == req.IdPaymentMethod && p.Stsrc);
        if (!paymentOk)
            return BadRequest(new { message = "Metode pembayaran tidak valid" });

        var grouped = req.Items
            .GroupBy(i => i.IdProduct)
            .Select(g => new { IdProduct = g.Key, Qty = g.Sum(x => x.Qty) })
            .ToList();

        var ids = grouped.Select(g => g.IdProduct).ToList();
        var products = await _db.MsProducts
            .Where(p => ids.Contains(p.IdProduct) && p.Stsrc)
            .ToListAsync();

        var userId = CurrentUserId;
        var now = DateTime.Now;
        var transactionId = Guid.NewGuid().ToString();
        var details = new List<TrTransactionDetail>();
        decimal total = 0;

        foreach (var g in grouped)
        {
            var product = products.FirstOrDefault(p => p.IdProduct == g.IdProduct);
            if (product == null)
                return BadRequest(new { message = "Barang tidak ditemukan" });

            if (g.Qty > product.Stock)
                return BadRequest(new { message = "Jumlah barang yang dimasukkan melebihi sisa stok." });

            var subTotal = Math.Round(product.Price * g.Qty * (1 - product.Discount / 100m), 2);
            total += subTotal;

            product.Stock -= g.Qty;
            product.Dateup = now;
            product.Userup = userId;

            details.Add(new TrTransactionDetail
            {
                IdTransactionDetail = Guid.NewGuid().ToString(),
                IdTransaction = transactionId,
                IdProduct = product.IdProduct,
                Qty = g.Qty,
                Price = product.Price,
                Discount = product.Discount,
                SubTotal = subTotal,
                Stsrc = true,
                Datein = now,
                Userin = userId
            });
        }

        await using var tx = await _db.Database.BeginTransactionAsync();

        var invoice = await BuildNextInvoiceAsync(userId);
        var header = new TrTransaction
        {
            IdTransaction = transactionId,
            InvoiceNo = invoice,
            TransactionDate = now,
            IdUser = userId,
            IdPaymentMethod = req.IdPaymentMethod,
            TotalPrice = total,
            Stsrc = true,
            Datein = now,
            Userin = userId
        };

        _db.TrTransactions.Add(header);
        _db.TrTransactionDetails.AddRange(details);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        var next = await BuildNextInvoiceAsync(userId);
        return Ok(new
        {
            message = "Transaksi berhasil",
            invoiceNo = invoice,
            totalPrice = total,
            nextInvoiceNo = next
        });
    }
}