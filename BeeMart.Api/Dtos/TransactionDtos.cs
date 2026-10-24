namespace BeeMart.Api.Dtos;

public class CartItemRequest
{
    public string IdProduct { get; set; } = "";
    public int Qty { get; set; }
}

public class CreateTransactionRequest
{
    public int IdPaymentMethod { get; set; }
    public List<CartItemRequest> Items { get; set; } = new();
}

public record HistoryItemDto(
    string InvoiceNo,
    DateTime TransactionDate,
    string Kasir,
    int TotalItem,
    string Payment,
    decimal TotalPrice);

public record PagedResult<T>(
    List<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);